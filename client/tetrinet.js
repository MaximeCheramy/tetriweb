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

  this.connect = function(nickname, team) {
    // Clear
    if (timer) { clearTimeout(timer); }
    if (xhr_in) { xhr_in.abort(); }

    xhr_in = new goog.net.XhrIo();

    goog.events.listen(xhr_in, goog.net.EventType.COMPLETE,
        goog.bind(function(e) {
      if (e.target.isSuccess()) {
        var response = e.target.getResponseJson();
        if (!response['error']) {
          // Reset
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

  this.readFromServer = function() {
    xhr_in = new goog.net.XhrIo();

    goog.events.listen(xhr_in, goog.net.EventType.COMPLETE,
        goog.bind(function(e) {
      if (e.target.isSuccess()) {
        this.handleResponse(e.target.getResponseJson());
        this.readFromServer();
      } else {
        timer = setTimeout(function() { tetrinet.readFromServer(); }, 5000);
      }
    }, this));

    xhr_in.send(url + '?pnum=' + pnum);
  };

  this.disconnect = function() {
  };

  this.handleResponse = function(response) {
    for (var i = 0; i < response['msg'].length; i++) {
      var msg = response['msg'][i];
      var data = msg.split(' ');
      var message = '';
      switch (data[0]) {
        case 'playerjoin':
          var player_id = data[1];
          var nick = data[2];
          if (player_id != pnum) {
            players[player_id] = nick;
            this.initField(player_id);
          }
          message = '*** ' + nick + ' a rejoint le jeu.';
          break;
        case 'playerleave':
          var player_id = data[1];
          this.destroyField(player_id);
          message = '*** ' + players[player_id] + ' a quitté le jeu.';
          break;
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
        case 'pline':
          var player_id = data[1];
          var m = msg.substr(data[0].length + data[1].length + 2);
          if (player_id == 0) {
            message = '*** ' + m;
          } else {
            message = '&lt;' + players[player_id] + '&gt; ' + m;
          }
          break;
        case 'newgame':
          message = '*** La partie a débuté';
          /*for (player_id in players) {
            this.clearField(player_id);
          }*/
          tetris.init(data[5], data[6], data[7]);
          break;
        case 'endgame':
          message = '*** La partie est terminée';
          clearTimeout(tetris.montimer);
          break;
        case 'f':
          var player_id = data[1];
          var field = msg.substr(data[0].length + data[1].length + 2);
          var x, y;
          // Description complète du field (22*12)
          if (field[0] >= '0') {
            for (var i = 0; i < field.length; i++) {
              y = Math.floor(i / 12);
              x = i % 12;
              this.setBlock(player_id, x, y, this.normalize(field[i]));
            }
          } else {
            // Description partielle du field (blocs qui ont changé)
            // "!" et "3" trouvés dans le code de gtetrinet...
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
        case 'sb':
          // Reception d'un special
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
        default:
          message = msg;
      }
      if (message.length > 0) {
        goog.dom.getElement('content').innerHTML +=
          '<div>' + message + '</div>';
      }
    }
  };

  this.sendMessage = function(msg) {
    xhr_out = new goog.net.XhrIo();
    xhr_out.send(url + '?' +
      goog.uri.utils.buildQueryDataFromMap({pnum: pnum, send: msg}));
  };

  this.startGame = function() {
    this.sendMessage('startgame 1 ' + pnum);
  };

  this.sayPline = function(msg) {
    this.sendMessage('pline ' + pnum + ' ' + msg);
    goog.dom.getElement('content').innerHTML += '<div>' + '&lt;' +
      players[pnum] + '&gt; ' + msg + '</div>';
  };

  this.sendPlayerlost = function() {
    this.sendMessage('playerlost ' + pnum);
  };

  this.sendLines = function(nblines) {
    this.sendMessage('sb 0 cs' + nblines + ' ' + pnum);
  };

  this.initMyField = function() {
    var next = goog.dom.createDom('div', {id: 'nextpiece'});
    var field = goog.dom.createDom('div', {id: 'myfield'});
    field.setAttribute('tabindex', 1);
    var cont = goog.dom.createDom('div', {id: 'mycontainer'}, next, field);
    goog.dom.appendChild(goog.dom.getElement('fields'), cont);
  };

  this.initField = function(player_id) {
    var field = goog.dom.createDom('div', {class: 'field', id: 'field-' +
      player_id});
    goog.dom.appendChild(goog.dom.getElement('fields'), field);

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

  this.destroyField = function(player_id) {
    goog.dom.removeNode(goog.dom.getElement('field-' + player_id));
    delete fields[player_id];
  };

  this.clearField = function(player_id) {
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        this.setBlock(player_id, l, c, 0);
      }
    }
  };

  this.setBlock = function(player_id, x, y, type) {
    fields[player_id][y][x] = type;
    var block = goog.dom.getElement('block-' + player_id + '-' + y + '-' + x);
    block.className = 'block ' + tetris.convert(type);
  };

  this.sendField = function(field, oldfield) {
    var seen;
    var f = 'f ' + pnum + ' ';
    for (var b = 0; b < 15; b++) {
      seen = false;
      for (var l = 0; l < 22; l++) {
        for (var c = 0; c < 12; c++) {
          if (field[l][c] == b && field[l][c] != oldfield[l][c]) {
            if (!seen) {
              f += String.fromCharCode(b + '!'.charCodeAt(0));
              seen = true;
            }
            f += String.fromCharCode(c + '3'.charCodeAt(0));
            f += String.fromCharCode(l + '3'.charCodeAt(0));
          }
        }
      }
    }
    this.sendMessage(f);
  };

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
};
