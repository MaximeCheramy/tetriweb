/**
 * Ajax.Request.abort
 * extend the prototype.js Ajax.Request object so that it supports an abort method
 */
Ajax.Request.prototype.abort = function() {
  // prevent and state change callbacks from being issued
  this.transport.onreadystatechange = Prototype.emptyFunction;
  // abort the XHR
  this.transport.abort();
  // update the request counter
  Ajax.activeRequestCount--;
};

var Tetrinet = Class.create();
Tetrinet.prototype = {
  pnum: 0,
  url: './backend.php',
  noerror: true,
  ajax: null,
  request: null,
  timer: null,
  players: [],
  teams: [],
  fields: [],

  initialize: function() {
  },

  connect: function(nickname, team) {
    this.ajax = new Ajax.Request(this.url, {
      method: 'get',
      parameters: { 'connect' : nickname },
      onSuccess: function(transport) {
        var response = transport.responseText.evalJSON();
        if (!response['error']) {
          // Reset all
          if (this.tetrinet.timer) { clearTimeout(this.tetrinet.timer); }
          if (this.tetrinet.request) { this.tetrinet.request.abort(); }
          $('fields').update();
          this.tetrinet.players.clear();
          this.tetrinet.teams.clear();
          this.tetrinet.fields.clear();
          // Init
          this.tetrinet.pnum = response['pnum'];
          this.tetrinet.players[response['pnum']] = $('nickname').value;
          this.tetrinet.teams[response['pnum']] = $('team').value;
          this.tetrinet.initMyField();
          this.tetrinet.sendMessage('team ' + this.tetrinet.pnum +
                 ' ' + $('team').value);
          this.tetrinet.readFromServer();
          if (this.tetrinet.pnum == 1) {
            $('startgame').disabled = false;
          }
        }
        else {
          alert('Connexion impossible : ' + response['error']);
        }
      }
    });
    this.ajax.tetrinet = this;
  },

  readFromServer: function() {
    this.request = new Ajax.Request(this.url, {
      method: 'get',
      parameters: { 'pnum' : this.pnum },
      onSuccess: function(transport) {
        var response = transport.responseText.evalJSON();
        this.tetrinet.handleResponse(response);
        this.tetrinet.noerror = true;
      },
      onFailure: function(transport) {
        this.tetrinet.noerror = false;
      },
      onComplete: function(transport) {
        if (!this.tetrinet.noerror) {
          this.tetrinet.timer = setTimeout(function() { tetrinet.readFromServer() }, 5000);
        }
        else {
          this.tetrinet.readFromServer();
        }
      }
    });
    this.request.tetrinet = this;
  },

  disconnect: function() {
  },

  handleResponse: function(response) {
    for each(msg in response['msg']) {
      var data = msg.split(' ');
      var message = '';
      switch (data[0]) {
        case 'playerjoin':
          var player_id = data[1];
          var nick = data[2];
          if (player_id != this.pnum) {
            this.players[player_id] = nick;
            this.initField(player_id);
          }
          message = '*** ' + nick + ' a rejoint le jeu.';
          break;
        case 'playerleave':
          var player_id = data[1];
          this.destroyField(player_id);
          message = '*** ' + this.players[player_id] + ' a quitté le jeu.';
          break;
        case 'team':
          var player_id = data[1];
          var team = data[2];
          if (team != undefined) {
            this.teams[player_id] = team;
            message = '*** ' + this.players[player_id] +
              " est dans l'équipe " + team + '.';
          }
          else {
            message = '*** ' + this.players[player_id] + ' est seul.';
          }
          break;
        case 'pline':
          var player_id = data[1];
          var m = msg.substr(data[0].length + data[1].length + 2);
          if (player_id == 0) {
            message = '*** ' + m;
          }
          else {
            message = '&lt;' + this.players[player_id] + '&gt; ' + m;
          }
          break;
        case 'newgame':
          message = '*** La partie a débuté';
          /*for (player_id in this.players) {
            this.clearField(player_id);
          }*/
          this.tetris.init(data[5], data[6], data[7]);
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
          }
          // Description partielle du field (blocs qui ont changé)
          // "!" et "3" trouvés dans le code de gtetrinet...
          else {
            var block;
            for (var i = 0; i < field.length; i++) {
              if (field[i] < '0') {
                block = field.charCodeAt(i) - '!'.charCodeAt(0);
              }
              else {
                x = field.charCodeAt(i) - '3'.charCodeAt(0);
                y = field.charCodeAt(++i) - '3'.charCodeAt(0);
                this.setBlock(player_id, x, y, block);
              }
            }
          }
          break;
        case 'sb':
          // Reception d'un special
          if (data[1] == 0 || data[1] == this.pnum) {
            if (data[2] == 'cs1' || data[2] == 'a') {
              this.tetris.addLine();
            } else if (data[2] == 'cs2') {
              this.tetris.addLine();
              this.tetris.addLine();
            } else if (data[2] == 'cs4') {
              this.tetris.addLine();
              this.tetris.addLine();
              this.tetris.addLine();
              this.tetris.addLine();
            } else if (data[2] == 'c') {
              this.tetris.clearLine();
            } else if (data[2] == 'g') {
              this.tetris.blockGravity();
            } else if (data[2] == 'n') {
              this.tetris.nukeField();
            }
          }
          break;
        default:
          message = msg;
      }
      if (message.length > 0) {
        $('content').innerHTML += '<div>' + message + '</div>';
      }
    }
  },

  sendMessage: function(msg) {
    new Ajax.Request(this.url, {
      method: 'get',
      parameters: { 'pnum' : this.pnum, 'send' : msg }
    });
  },

  startGame: function() {
    this.sendMessage('startgame 1 ' + this.pnum);
  },

  sayPline: function(msg) {
    this.sendMessage('pline ' + this.pnum + ' ' + msg);
    $('content').innerHTML += '<div>' + '&lt;' +
      this.players[this.pnum] + '&gt; ' + msg + '</div>';
  },

  sendPlayerlost: function() {
    this.sendMessage('playerlost ' + this.pnum);
  },

  sendLines: function(nblines) {
    this.sendMessage('sb 0 cs' + nblines + ' ' + this.pnum);
  },

  initMyField: function() {
    var cont = document.createElement('div');
    $('fields').appendChild(cont);
    cont.id = 'mycontainer';

    var next = document.createElement('div');
    cont.appendChild(next);
    next.id = 'nextpiece';

    var field = document.createElement('div');
    cont.appendChild(field);
    field.id = 'myfield';
    field.setAttribute('tabindex', 1);
  },

  initField: function(player_id) {
    var field = document.createElement('div');
    $('fields').appendChild(field);
    field.className = 'field';
    field.id = 'field-' + player_id;

    var block;

    this.fields[player_id] = new Array(22);
    for (var l = 0; l < 22; l++) {
      this.fields[player_id][l] = new Array(12);
      for (var c = 0; c < 12; c++) {
        this.fields[player_id][l][c] = '0';
        block = document.createElement('div');
        field.appendChild(block);
        block.className = 'block ' + this.tetris.convert(0);
        block.id = 'block-' + player_id + '-' + l + '-' + c;
        block.style.top = l * 20 + 1;
        block.style.left = c * 20 + 1;
      }
    }
  },

  destroyField: function(player_id) {
    $('field-' + player_id).remove();
    delete this.fields[player_id];
  },

  clearField: function(player_id) {
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        this.setBlock(player_id, l, c, 0);
      }
    }
  },

  setBlock: function(player_id, x, y, type) {
    this.fields[player_id][y][x] = type;
    var block = $('block-' + player_id + '-' + y + '-' + x);
    block.className = 'block ' + this.tetris.convert(type);
  },

  sendField: function(field, oldfield) {
    var seen;
    var f = 'f ' + this.pnum + ' ';
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
  },

  normalize: function(type) {
    var specials = {'a': 6, 'c': 7, 'n': 8, 'r': 9, 's': 10, 'b': 11, 'g': 12, 'q': 13, 'o': 14};
    if (type >= '0' && type <= '5') {
      type = parseInt(type);
    } else if (specials[type] != undefined) {
      type = specials[type];
    }
    return type;
  }
};
