goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.net.XhrIo');

goog.provide('tetriweb.Tetrinet');

/**
 * Tetrinet.
 * @constructor
 */
tetriweb.Tetrinet = function() {
  var pnum = 0;
  var url = 'backend.php';
  var xhr_in = null;
  var xhr_out = null;
  var timer = null;
  var players = [];
  var teams = [];
  var fields = [];

  /*
   * Connects a player to the server and retrieves its playernum.
   * @param {String} nickname
   * @param {String} team
   */
  this.connect = function(nickname, team) {
    // Clear existing timers and requests
    if (timer) { clearTimeout(timer); }
    if (xhr_in) { xhr_in.abort(); }

    xhr_in = new goog.net.XhrIo();

    goog.events.listen(xhr_in, goog.net.EventType.COMPLETE,
        goog.bind(function(e) {
      if (e.target.isSuccess()) {
        var response = e.target.getResponseJson();
        if (!response['error']) {
          // Reset all
          goog.dom.removeChildren(goog.dom.getElement('fields'));
          players = [];
          teams = [];
          fields = [];

          // Init
          var nick = goog.dom.getElement('nickname').value;
          var team = goog.dom.getElement('team').value;
          pnum = response['pnum'];
          players[response['pnum']] = nick;
          teams[response['pnum']] = team;
          this.initMyField();
          this.sendMessage('team ' + pnum + ' ' + team);
          this.readFromServer();

          if (pnum == 1) {
            goog.dom.getElement('startGame').disabled = false;
          }
        } else {
          alert('Connexion impossible : ' + response['error']);
        }
      }
    }, this));

    xhr_in.send(url + '?connect=' + nickname);
  };

  /*
   * Reads data from server through the proxy.
   */
  this.readFromServer = function() {
    xhr_in = new goog.net.XhrIo();

    goog.events.listen(xhr_in, goog.net.EventType.COMPLETE,
        goog.bind(function(e) {
      if (e.target.isSuccess()) {
        this.handleResponse(e.target.getResponseJson());
        this.readFromServer();
      } else {
        // Wait before reconnecting if there was an error
        timer = setTimeout(function() { tetrinet.readFromServer(); }, 5000);
      }
    }, this));

    xhr_in.send(url + '?pnum=' + pnum);
  };

  /*
   * Disconnects the player from the server.
   * TODO: implement :)
   */
  this.disconnect = function() {
  };

  /*
   * Handles the server messages.
   * @param {Object} response The JSON response sent by the proxy
   * TODO: pass response['msg'] instead of the whole response object
   */
  this.handleResponse = function(response) {
    for (var i = 0; i < response['msg'].length; i++) {
      var msg = response['msg'][i];
      var data = msg.split(' ');
      var message = ''; // Message that will be shown in the partyline
      switch (data[0]) {
        // New player joins
        case 'playerjoin':
          var player_id = data[1];
          var nick = data[2];
          if (player_id != pnum) {
            players[player_id] = nick;
            this.initField(player_id);
          }
          message = '*** ' + nick + ' a rejoint le jeu.';
          break;
        // A player has left
        case 'playerleave':
          // Destroy its field
          var player_id = data[1];
          this.destroyField(player_id);
          message = '*** ' + players[player_id] + ' a quitté le jeu.';
          break;
        // A player has changed teams
        case 'team':
          var player_id = data[1];
          var team = data[2];
          if (team != undefined) {
            teams[player_id] = team;
            message = '*** ' + players[player_id] +
              " est dans l'équipe " + team + '.';
          } else {
            message = '*** ' + players[player_id] + ' est seul.';
          }
          break;
        // New message on the partyline (from a player or the server)
        case 'pline':
          var player_id = data[1];
          var m = msg.substr(data[0].length + data[1].length + 2);
          if (player_id == 0) {
            message = '*** ' + m;
          } else {
            message = '&lt;' + players[player_id] + '&gt; ' + m;
          }
          break;
        // Starting a new game
        case 'newgame':
          message = '*** La partie a débuté';
          // Clear all fields
          /*for (player_id in players) {
            this.clearField(player_id);
          }*/
          // Initialize tetris
          tetris.init(data[5], data[6], data[7], data[8], data[9]);
          break;
        // All players lose except one
        case 'endgame':
          message = '*** La partie est terminée';
          // Stop tetris
          // TODO: disable key events in the field
          clearTimeout(tetris.montimer);
          break;
        // Field description
        case 'f':
          var player_id = data[1];
          var field = msg.substr(data[0].length + data[1].length + 2);
          var x, y;
          // Complete field
          if (field[0] >= '0') {
            for (var i = 0; i < field.length; i++) {
              y = Math.floor(i / 12);
              x = i % 12;
              this.setBlock(player_id, x, y, this.normalize(field[i]));
            }
          } else {
            // Only differences
            var block;
            for (var i = 0; i < field.length; i++) {
              if (field[i] < '0') {
                block = field.charCodeAt(i) - '!'.charCodeAt(0);
              } else {
                x = field.charCodeAt(i) - '3'.charCodeAt(0);
                y = field.charCodeAt(++i) - '3'.charCodeAt(0);
                this.setBlock(player_id, x, y, block);
              }
            }
          }
          break;
        // Receiving a special
        case 'sb':
          if (data[1] == 0 || data[1] == pnum) {
            if (data[2] == 'cs1' || data[2] == 'a') {
              tetris.addLine();
            } else if (data[2] == 'cs2') {
              tetris.addLine();
              tetris.addLine();
            } else if (data[2] == 'cs4') {
              tetris.addLine();
              tetris.addLine();
              tetris.addLine();
              tetris.addLine();
            } else if (data[2] == 'c') {
              tetris.clearLine();
            } else if (data[2] == 'g') {
              tetris.blockGravity();
            } else if (data[2] == 'n') {
              tetris.nukeField();
            }
          }
          break;
        // Fallback
        default:
          message = msg;
      }
      if (message.length > 0) {
        goog.dom.getElement('content').innerHTML +=
          '<div>' + message + '</div>';
      }
    }
  };

  /*
   * Sends the given message to the server.
   * @param {string} msg The message to send
   */
  this.sendMessage = function(msg) {
    xhr_out = new goog.net.XhrIo();
    xhr_out.send(url + '?' +
      goog.uri.utils.buildQueryDataFromMap({pnum: pnum, send: msg}));
  };

  /*
   * Notifies the server that we want to start a game.
   */
  this.startGame = function() {
    this.sendMessage('startgame 1 ' + pnum);
  };

  /*
   * Sends a message on the partyline.
   * @param {string} msg The message to send
   */
  this.sayPline = function(msg) {
    this.sendMessage('pline ' + pnum + ' ' + msg);
    goog.dom.getElement('content').innerHTML += '<div>' + '&lt;' +
      players[pnum] + '&gt; ' + msg + '</div>';
  };

  /*
   * Notifies the server that the player has lost.
   */
  this.sendPlayerlost = function() {
    this.sendMessage('playerlost ' + pnum);
  };

  /*
   * Sends nblines lines to all players.
   * @param {number} nblines The number of lines to send
   */
  this.sendLines = function(nblines) {
    this.sendMessage('sb 0 cs' + nblines + ' ' + pnum);
  };

  /*
   * Sends a special to the given player.
   * @param {string} special The special to send
   * @param {number} playerDest The player to whom the special is sent (0 = all)
   */
  this.sendSpecial = function(special, playerDest) {
    this.sendMessage('sb ' + playerDest + ' ' + special + ' ' + pnum);
  };

  /*
   * Initializes the player field.
   */
  this.initMyField = function() {
    var next = goog.dom.createDom('div', {id: 'nextpiece'});
    var specialBar = goog.dom.createDom('div', {id: 'specialbar'});
    var field = goog.dom.createDom('div', {id: 'myfield'});
    field.setAttribute('tabindex', 1);
    var cont = goog.dom.createDom('div', {id: 'mycontainer'},
      next, field, specialBar);
    goog.dom.appendChild(goog.dom.getElement('fields'), cont);
  };

  /*
   * Initializes a player's field.
   * @param {number} player_id The owner of the field we want to initialize
   */
  this.initField = function(player_id) {
    // Create a new field div and add it to the fields container
    var field = goog.dom.createDom('div', {class: 'field', id: 'field-' +
      player_id});
    goog.dom.appendChild(goog.dom.getElement('fields'), field);

    // Fill the field with empty blocks
    var block;
    fields[player_id] = new Array(22);
    for (var l = 0; l < 22; l++) {
      fields[player_id][l] = new Array(12);
      for (var c = 0; c < 12; c++) {
        fields[player_id][l][c] = '0';
        block = goog.dom.createDom('div');
        block.className = 'block ' + this.tetris.convert(0);
        block.id = 'block-' + player_id + '-' + l + '-' + c;
        block.style.top = l * 20 + 1;
        block.style.left = c * 20 + 1;
        goog.dom.appendChild(field, block);
      }
    }
  };

  /*
   * Destroys a player's field.
   * @param {number} player_id The owner of the field we want to destroy
   */
  this.destroyField = function(player_id) {
    goog.dom.removeNode(goog.dom.getElement('field-' + player_id));
    delete fields[player_id];
  };

  /*
   * Clears a player's field.
   * @param {number} player_id The owner of the field we want to clear
   */
  this.clearField = function(player_id) {
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        this.setBlock(player_id, l, c, 0);
      }
    }
  };

  /*
   * Sets a block on a player's field.
   * @param {number} player_id The owner of the block
   * @param {number} x The x-coordinate of the block
   * @param {number} y The y-coordinate of the block
   * @param {number} type The block type
   */
  this.setBlock = function(player_id, x, y, type) {
    fields[player_id][y][x] = type;
    var block = goog.dom.getElement('block-' + player_id + '-' + y + '-' + x);
    block.className = 'block ' + tetris.convert(type);
  };

  /*
   * Sends the player's field to the server.
   * TODO: should send the difference between field and oldfield only if the
   * number of differences if less than FIELD_WIDTH*FIELD_HEIGHT/2
   * (otherwise should send the whole field)
   * @param {Array.<Array<number>>} Current field to send
   * @param {Array.<Array<number>>} The old field
   */
  this.sendField = function(field, oldfield) {
    // Only sends the differences between field and oldfield
    var seen;
    var f = 'f ' + pnum + ' ';
    // For each block type...
    for (var b = 0; b < 15; b++) {
      seen = false;
      // For each block of this type on the field which has changed...
      for (var l = 0; l < 22; l++) {
        for (var c = 0; c < 12; c++) {
          if (field[l][c] == b && field[l][c] != oldfield[l][c]) {
            // First time seen : output block type
            if (!seen) {
              f += String.fromCharCode(b + '!'.charCodeAt(0));
              seen = true;
            }
            // Output new coordinates of the block
            f += String.fromCharCode(c + '3'.charCodeAt(0));
            f += String.fromCharCode(l + '3'.charCodeAt(0));
          }
        }
      }
    }
    this.sendMessage(f);
  };

  /*
   * Normalizes a block type to the matching integer type.
   * @param {(string|number)} Block type (integer or string)
   * @return {number} Matching integer block type
   */
  this.normalize = function(type) {
    var specials = {'a': 6, 'c': 7, 'n': 8, 'r': 9, 's': 10, 'b': 11, 'g': 12,
                    'q': 13, 'o': 14};
    if (type >= '0' && type <= '5') {
      type = parseInt(type);
    } else if (specials[type] != undefined) {
      type = specials[type];
    }
    return type;
  };

  /*
   * Tells if a player exists.
   * @param {number} playerNum
   * @return {boolean}
   */
  this.playerExists = function(playerNum) {
    return players[playerNum] != undefined;
  };
};
