goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.net.XhrIo');

goog.provide('tetriweb.Tetrinet');

/**
 * Tetrinet.
 * @constructor
 */
tetriweb.Tetrinet = function() {
};

/**
 * Connects the player to the server and retrieves its playernum.
 * @param {String} nickname The player's nickname.
 * @param {String} team The player's team.
 */
tetriweb.Tetrinet.prototype.connect = function(nickname, team) {
  // Clear existing timers and requests
  if (this.timer_) { clearTimeout(this.timer_); }
  if (this.xhr_in_) { this.xhr_in_.abort(); }

  this.xhr_in_ = new goog.net.XhrIo();

  goog.events.listen(this.xhr_in_, goog.net.EventType.COMPLETE,
      goog.bind(function(e) {
    if (e.target.isSuccess()) {
      var response = e.target.getResponseJson();
      if (!response['error']) {
        // Reset all
        goog.dom.removeChildren(goog.dom.getElement('fields'));
        this.players_ = [];
        this.teams_ = [];
        this.fields_ = [];

        // Init
        var nick = goog.dom.getElement('nickname').value;
        var team = goog.dom.getElement('team').value;
        this.pnum_ = response['pnum'];
        this.players_[response['pnum']] = nick;
        this.teams_[response['pnum']] = team;
        this.initMyField();
        this.sendMessage_('team ' + this.pnum_ + ' ' + team);
        this.readFromServer_();

        if (this.pnum_ == 1) {
          goog.dom.getElement('startGame').disabled = false;
        }
      } else {
        alert('Connexion impossible : ' + response['error']);
      }
    }
  }, this));

  this.xhr_in_.send(this.url_ + '?connect=' + nickname);
};

/**
 * Disconnects the player from the server.
 * TODO: implement :)
 */
tetriweb.Tetrinet.prototype.disconnect = function() {
};

/**
 * Reads data from server through the proxy.
 * @private
 */
tetriweb.Tetrinet.prototype.readFromServer_ = function() {
  this.xhr_in_ = new goog.net.XhrIo();

  goog.events.listen(this.xhr_in_, goog.net.EventType.COMPLETE,
      goog.bind(function(e) {
    if (e.target.isSuccess()) {
      this.handleResponse_(e.target.getResponseJson());
      this.readFromServer_();
    } else {
      // Wait before reconnecting if there was an error
      this.timer_ = setTimeout(goog.bind(this.readFromServer_, this), 5000);
    }
  }, this));

  this.xhr_in_.send(this.url_ + '?pnum=' + this.pnum_);
};

/**
 * Handles the server messages.
 * TODO: pass response['msg'] instead of the whole response object
 * @param {Object} response The JSON response sent by the proxy.
 * @private
 */
tetriweb.Tetrinet.prototype.handleResponse_ = function(response) {
  for (var i = 0; i < response['msg'].length; i++) {
    var msg = response['msg'][i];
    var data = msg.split(' ');
    var message = ''; // Message that will be shown in the partyline
    switch (data[0]) {
      // New player joins
      case 'playerjoin':
        var player_id = data[1];
        var nick = data[2];
        if (player_id != this.pnum_) {
          this.players_[player_id] = nick;
          this.initField_(player_id);
        }
        message = '*** ' + nick + ' a rejoint le jeu.';
        break;
      // A player has left
      case 'playerleave':
        // Destroy its field
        var player_id = data[1];
        this.destroyField_(player_id);
        message = '*** ' + this.players_[player_id] + ' a quitté le jeu.';
        break;
      // A player has changed teams
      case 'team':
        var player_id = data[1];
        var team = data[2];
        if (team != undefined) {
          this.teams_[player_id] = team;
          message = '*** ' + this.players_[player_id] +
            " est dans l'équipe " + team + '.';
        } else {
          message = '*** ' + this.players_[player_id] + ' est seul.';
        }
        break;
      // New message on the partyline (from a player or the server)
      case 'pline':
        var player_id = data[1];
        var m = msg.substr(data[0].length + data[1].length + 2);
        if (player_id == 0) {
          message = '*** ' + m;
        } else {
          message = '&lt;' + this.players_[player_id] + '&gt; ' + m;
        }
        break;
      // Starting a new game
      case 'newgame':
        message = '*** La partie a débuté';
        // Clear all fields
        /**for (player_id in this.players_) {
          this.clearField_(player_id);
        }*/
        // Initialize tetris
        tetris.init(data[5], data[6], data[7], data[8], data[9]);
        break;
      // All players lose except one
      case 'endgame':
        message = '*** La partie est terminée';
        // Stop tetris
        // TODO: disable key events in the field
        clearTimeout(tetris.stepTimer);
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
            this.setBlock_(player_id, x, y,
              tetriweb.Tetrinet.normalize(field[i]));
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
              this.setBlock_(player_id, x, y, block);
            }
          }
        }
        break;
      // Receiving a special
      case 'sb':
        if (data[1] == 0 || data[1] == this.pnum_) {
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
          } else if (data[2] == 'b') {
            tetris.clearSpecialBlocks();
          } else if (data[2] == 'c') {
            tetris.clearLine();
          } else if (data[2] == 'g') {
            tetris.blockGravity();
          } else if (data[2] == 'n') {
            tetris.nukeField();
          } else if (data[2] == 'r') {
            tetris.randomClearBlocks();
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

/**
 * Sends the given message to the server.
 * @param {string} msg The message to send.
 * @private
 */
tetriweb.Tetrinet.prototype.sendMessage_ = function(msg) {
  this.xhr_out_ = new goog.net.XhrIo();
  this.xhr_out_.send(this.url_ + '?' +
    goog.uri.utils.buildQueryDataFromMap({'pnum': this.pnum_, 'send': msg}));
};

/**
 * Notifies the server that we want to start a game.
 */
tetriweb.Tetrinet.prototype.startGame = function() {
  this.sendMessage_('startgame 1 ' + this.pnum_);
};

/**
 * Sends a message on the partyline.
 * @param {string} msg The message to send.
 */
tetriweb.Tetrinet.prototype.sayPline = function(msg) {
  this.sendMessage_('pline ' + this.pnum_ + ' ' + msg);
  goog.dom.getElement('content').innerHTML += '<div>' + '&lt;' +
    this.players_[this.pnum_] + '&gt; ' + msg + '</div>';
};

/**
 * Notifies the server that the player has lost.
 */
tetriweb.Tetrinet.prototype.sendPlayerlost = function() {
  this.sendMessage_('playerlost ' + this.pnum_);
};

/**
 * Sends nblines lines to all players.
 * @param {number} nblines The number of lines to send.
 */
tetriweb.Tetrinet.prototype.sendLines = function(nblines) {
  this.sendMessage_('sb 0 cs' + nblines + ' ' + this.pnum_);
};

/**
 * Sends a special to the given player.
 * @param {string} special The special to send.
 * @param {number} playerDest The player to whom the special is sent (0 = all).
 */
tetriweb.Tetrinet.prototype.sendSpecial = function(special, playerDest) {
  this.sendMessage_('sb ' + playerDest + ' ' + special + ' ' + this.pnum_);
};

/**
 * Initializes the player's field.
 */
tetriweb.Tetrinet.prototype.initMyField = function() {
  var next = goog.dom.createDom('div', {id: 'nextpiece'});
  var specialBar = goog.dom.createDom('div', {id: 'specialbar'});
  var field = goog.dom.createDom('div', {id: 'myfield'});
  field.setAttribute('tabindex', 1);
  var cont = goog.dom.createDom('div', {id: 'mycontainer'},
    next, field, specialBar);
  goog.dom.appendChild(goog.dom.getElement('fields'), cont);
};

/**
 * Initializes a player's field.
 * @param {number} player_id The owner of the field we want to initialize.
 * @private
 */
tetriweb.Tetrinet.prototype.initField_ = function(player_id) {
  // Create a new field div and add it to the fields container
  var field = goog.dom.createDom('div', {className: 'field', id: 'field-' +
    player_id});
  goog.dom.appendChild(goog.dom.getElement('fields'), field);

  // Fill the field with empty blocks
  var block;
  this.fields_[player_id] = new Array(22);
  for (var l = 0; l < 22; l++) {
    this.fields_[player_id][l] = new Array(12);
    for (var c = 0; c < 12; c++) {
      this.fields_[player_id][l][c] = '0';
      block = goog.dom.createDom('div');
      block.className = 'block ' + tetriweb.Tetris.convert(0);
      block.id = 'block-' + player_id + '-' + l + '-' + c;
      block.style.top = l * 20 + 1;
      block.style.left = c * 20 + 1;
      goog.dom.appendChild(field, block);
    }
  }
};

/**
 * Destroys a player's field.
 * @param {number} player_id The owner of the field we want to destroy.
 * @private
 */
tetriweb.Tetrinet.prototype.destroyField_ = function(player_id) {
  goog.dom.removeNode(goog.dom.getElement('field-' + player_id));
  delete this.fields_[player_id];
};

/**
 * Clears a player's field.
 * @param {number} player_id The owner of the field we want to clear.
 * @private
 */
tetriweb.Tetrinet.prototype.clearField_ = function(player_id) {
  for (var l = 0; l < 22; l++) {
    for (var c = 0; c < 12; c++) {
      this.setBlock_(player_id, l, c, 0);
    }
  }
};

/**
 * Sets a block on a player's field.
 * @param {number} player_id The owner of the block.
 * @param {number} x The x-coordinate of the block.
 * @param {number} y The y-coordinate of the block.
 * @param {number} type The block type.
 * @private
 */
tetriweb.Tetrinet.prototype.setBlock_ = function(player_id, x, y, type) {
  this.fields_[player_id][y][x] = type;
  var block = goog.dom.getElement('block-' + player_id + '-' + y + '-' + x);
  block.className = 'block ' + tetriweb.Tetris.convert(type);
};

/**
 * Sends the player's field to the server.
 * TODO: should send the difference between field and oldfield only if the
 * number of differences if less than FIELD_WIDTH*FIELD_HEIGHT/2
 * (otherwise should send the whole field)
 * @param {Array.<Array.<number>>} field Current field to send.
 * @param {Array.<Array.<number>>} oldfield The old field.
 */
tetriweb.Tetrinet.prototype.sendField = function(field, oldfield) {
  // Only sends the differences between field and oldfield
  var seen;
  var f = 'f ' + this.pnum_ + ' ';
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
  this.sendMessage_(f);
};

/**
 * Normalizes a block type to the matching integer type.
 * @param {(string|number)} type Block type (integer or string).
 * @return {number} Matching integer block type.
 */
tetriweb.Tetrinet.normalize = function(type) {
  var specials = {'a': 6, 'c': 7, 'n': 8, 'r': 9, 's': 10, 'b': 11, 'g': 12,
                  'q': 13, 'o': 14};
  if (type >= '0' && type <= '5') {
    type = parseInt(type);
  } else if (specials[type] != undefined) {
    type = specials[type];
  }
  return type;
};

/**
 * Tells if a player exists.
 * @param {number} playerNum The playernum we want to check the existence.
 * @return {boolean} true if the player exists, false otherwise.
 */
tetriweb.Tetrinet.prototype.playerExists = function(playerNum) {
  return this.players_[playerNum] != undefined;
};

/**
 * Returns the player's playernum.
 * @return {number} The player's playernum.
 */
tetriweb.Tetrinet.prototype.getMyPlayerNum = function() {
  return this.pnum_;
};

/**
 * @type {number}
 * @private
 */
tetriweb.Tetrinet.prototype.pnum_ = 0;

/**
 * @type {string}
 * @private
 */
tetriweb.Tetrinet.prototype.url_ = 'backend.php';

/**
 * @type {goog.net.XhrIo}
 * @private
 */
tetriweb.Tetrinet.prototype.xhr_in_ = null;

/**
 * @type {goog.net.XhrIo}
 * @private
 */
tetriweb.Tetrinet.prototype.xhr_out_ = null;

/**
 * @type {number}
 * @private
 */
tetriweb.Tetrinet.prototype.timer_ = null;

/**
 * @type {Array.<string>}
 * @private
 */
tetriweb.Tetrinet.prototype.players_ = null;

/**
 * @type {Array.<string>}
 * @private
 */
tetriweb.Tetrinet.prototype.teams_ = null;

/**
 * @type {Array.<Array.<number>>}
 * @private
 */
tetriweb.Tetrinet.prototype.fields_ = null;
