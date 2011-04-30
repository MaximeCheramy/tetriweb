goog.provide('tetriweb.Tetrinet');

goog.require('goog.events');
goog.require('goog.net.XhrIo');
goog.require('tetriweb.Graphics');


/**
 * Tetrinet.
 * @constructor
 */
tetriweb.Tetrinet = function() {
};


/**
 * Connects the player to the server and retrieves its playernum.
 * @param {string} nickname The player's nickname.
 * @param {string} team The player's team.
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
            this.players_ = [];
            this.teams_ = [];
            this.fields_ = [];

            // Init vars
            this.pnum_ = response['pnum'];
            this.players_[response['pnum']] = nickname;
            this.teams_[response['pnum']] = team;
            this.sendMessage_('team ' + this.pnum_ + ' ' + team);
            this.readFromServer_();

            // Init DOM
            tetriweb.Graphics.domInit(this.pnum_, nickname);

            tetriweb.Graphics.updatePlayerList(this.players_, this.teams_,
                this.getModerator_());
            tetriweb.Graphics.hideLoginForm();
          } else {
            alert('Connexion impossible : ' + response['error']);
          }
        } else {
          alert('Connexion impossible.');
        }
      }, this));

  this.xhr_in_.send(this.url_ + '?connect=' + nickname);
};


/**
 * Disconnects the player from the server.
 */
tetriweb.Tetrinet.prototype.disconnect = function() {
  if (this.pnum_) {
    if (this.xhr_in_) { this.xhr_in_.abort(); }
    this.sendMessage_('disconnect');
    this.tetris.stopGame();
    tetriweb.Graphics.displayLoginForm();
  }
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
        } else if (e.target.getStatus() == 410) {
          this.tetris.stopGame();
          tetriweb.Graphics.setErrorMessage('You have been disconnected.');
          tetriweb.Graphics.displayLoginForm();
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
      // Ping from the proxy
      case 'ping':
        this.pong();
        break;
      // New player joins
      case 'playerjoin':
        var player_id = data[1];
        var nick = data[2];
        if (player_id != this.pnum_) {
          this.players_[player_id] = nick;
          this.initField_(player_id);
        }
        tetriweb.Graphics.enableModeratorControls(this.checkModerator_());
        tetriweb.Graphics.updatePlayerList(this.players_, this.teams_,
            this.getModerator_());
        message = '*** ' + nick + ' a rejoint le jeu.';
        break;
      // A player has left
      case 'playerleave':
        // Destroy its field
        var player_id = data[1];
        message = '*** ' + this.players_[player_id] + ' a quitté le jeu.';
        this.destroyField_(player_id);
        delete this.players_[player_id];
        delete this.teams_[player_id];
        tetriweb.Graphics.enableModeratorControls(this.checkModerator_());
        tetriweb.Graphics.updatePlayerList(this.players_, this.teams_,
            this.getModerator_());
        break;
      // Pause the game.
      case 'pause':
        var state = data[1];
        if (state == '1') {
          this.tetris.pauseGame();
        } else {
          this.tetris.resumeGame();
        }
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
          delete this.teams_[player_id];
          message = '*** ' + this.players_[player_id] + ' est seul.';
        }
        tetriweb.Graphics.updatePlayerList(this.players_, this.teams_,
            this.getModerator_());
        break;
      // New message on the partyline (from a player or the server)
      case 'pline':
        var player_id = data[1];
        var m = msg.substr(data[0].length + data[1].length + 2);
        if (player_id == 0) {
          message = '*** ' + m;
        } else {
          message = '<' + this.players_[player_id] + '> ' + m;
        }
        break;
      case 'plineact':
        var player_id = data[1];
        var m = msg.substr(data[0].length + data[1].length + 2);
        message = '* ' + this.players_[player_id] + ' ' + m;
        break;
      case 'gmsg':
        message = msg.substr(data[0].length + 1);
        break;
      case 'lvl':
        var player_id = data[1];
        var level_num = data[2];
        // TODO. Attention c'est le client qui envoie son changement de level.
        break;
      // Starting a new game
      case 'newgame':
        message = '*** La partie a débuté';
        // Clear all fields
        for (var playerId in this.players_) {
          var pId = parseInt(playerId, 10)
          if (pId != this.pnum_) {
            this.clearField_(pId);
          }
        }
        // Start tetris
        var startingHeight = parseInt(data[1], 10);
        var startingLevel = parseInt(data[2], 10);
        var linesLevel = parseInt(data[3], 10);
        var levelIncrement = parseInt(data[4], 10);
        var specialLines = parseInt(data[5], 10);
        var specialCount = parseInt(data[6], 10);
        var specialCapacity = parseInt(data[7], 10);
        var piecesFreq = data[8], specialsFreq = data[9];
        this.tetris.startGame(startingHeight, startingLevel, linesLevel,
            levelIncrement, specialLines, specialCount, specialCapacity,
            piecesFreq, specialsFreq);
        tetriweb.Graphics.displayFields();
        tetriweb.Graphics.gameAreaFocus();
        tetriweb.Graphics.showPauseButton();
        tetriweb.Graphics.enablePauseResumeButtons(this.checkModerator_());
        break;
      case 'ingame':
        tetriweb.Graphics.displayFields();
        tetriweb.Graphics.disableField();
        break;
      // All players lose except one
      case 'endgame':
        message = '*** La partie est terminée';
        // Stop tetris
        this.tetris.stopGame();
        tetriweb.Graphics.displayChat();
        break;
      // Field description
      case 'f':
        var player_id = data[1];
        var field = msg.substr(data[0].length + data[1].length + 2);
        var x, y;
        // Complete field
        if (field[0] >= '0') {
          for (var j = 0; j < field.length; j++) {
            y = Math.floor(j / tetriweb.Tetris.WIDTH_);
            x = j % tetriweb.Tetris.WIDTH_;
            this.setBlock_(player_id, x, y,
                tetriweb.Tetrinet.charToInt(field[j]));
          }
        } else {
          // Only differences
          var block;
          for (var j = 0; j < field.length; j++) {
            if (field[j] < '0') {
              block = field.charCodeAt(j) - '!'.charCodeAt(0);
            } else if (block != undefined) {
              x = field.charCodeAt(j) - '3'.charCodeAt(0);
              y = field.charCodeAt(++j) - '3'.charCodeAt(0);
              this.setBlock_(player_id, x, y, block);
            }
          }
        }
        break;
      // Receiving a special
      case 'sb':
        if (data[1] == 0 || data[1] == this.pnum_) {
          if (data[2] == 'a') {
            this.tetris.addLine();
          } else if (data[2] == 'cs1' || data[2] == 'cs2' || data[2] == 'cs4') {
            if (this.teams_[data[3]] == undefined ||
                this.teams_[data[3]] != this.teams_[this.pnum_]) {
              if (data[2] == 'cs1') {
                this.tetris.addLine();
              } else if (data[2] == 'cs2') {
                this.tetris.addLine();
                this.tetris.addLine();
              } else if (data[2] == 'cs4') {
                this.tetris.addLine();
                this.tetris.addLine();
                this.tetris.addLine();
                this.tetris.addLine();
              }
            }
          } else if (data[2] == 'b') {
            this.tetris.clearSpecialBlocks();
          } else if (data[2] == 'c') {
            this.tetris.clearLine();
          } else if (data[2] == 'g') {
            this.tetris.blockGravity();
          } else if (data[2] == 'n') {
            this.tetris.nukeField();
          } else if (data[2] == 'o') {
            this.tetris.blockBomb();
          } else if (data[2] == 'q') {
            this.tetris.blockQuake();
          } else if (data[2] == 'r') {
            this.tetris.randomClearBlocks();
          } else if (data[2] == 's') {
            this.tetris.switchFields(data[3]);
          }
        }
        this.logEvent(data[2], data[1], data[3]);
        break;
      // Scores
      case 'winlist':
        var scores = msg.substr(data[0].length + 1).split(' ');
        this.scores_ = [];
        for (var j = 0; j < scores.length; j++) {
          var data2 = scores[j].split(';');
          var type = (data2[0].substr(0, 1) == 'p') ? 'player' : 'team';
          var name = data2[0].substr(1);
          var score = parseInt(data2[1], 10);
          this.scores_[j] = {name: name, type: type, score: score};
        }
        break;
      // Fallback
      default:
        message = msg;
    }
    if (message.length > 0) {
      // HL
      message = tetriweb.Graphics.hlNick(message, this.players_[this.pnum_]);
      tetriweb.Graphics.domWriteMessage(message);
    }
  }
};


/**
 * Logs an event.
 * TODO: more precise events? Colour depending on the event type (good/bad
 * special...)?
 * @param {string} special The special sent or received.
 * @param {number} to The target of the special.
 * @param {number} from The sender of the special.
 */
tetriweb.Tetrinet.prototype.logEvent = function(special, to, from) {
  var message = tetriweb.Tetris.SPECIALS[special];
  message += (to == 0) ? ' pour tous' : ' pour ' + this.players_[to];
  message += ' de la part de ' + this.players_[from];
  tetriweb.Graphics.domLogEvent(message);
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
 * Checks if the current user is the moderator.
 * @return {boolean} True if the user is the moderator.
 * @private
 */
tetriweb.Tetrinet.prototype.checkModerator_ = function() {
  return this.getModerator_() == this.pnum_;
};


/**
 * Gets the moderator's playernum.
 * @return {number} The moderator's playernum.
 * @private
 */
tetriweb.Tetrinet.prototype.getModerator_ = function() {
  var moderator = 0;
  for (var i = 0; i < this.players_.length && !moderator; i++) {
    if (this.players_[i] != undefined) {
      moderator = i;
    }
  }
  return moderator;
};


/**
 * Heartbeat.
 */
tetriweb.Tetrinet.prototype.heartbeat = function() {
  this.sendMessage_('f ' + this.pnum_);
};


/**
 * Changes teams.
 * @param {string} team The new team.
 */
tetriweb.Tetrinet.prototype.changeTeams = function(team) {
  var message;
  if (team != '') {
    this.teams_[this.pnum_] = team;
    message = '*** ' + this.players_[this.pnum_] +
        " est dans l'équipe " + team + '.';
  } else {
    delete this.teams_[this.pnum_];
    message = '*** ' + this.players_[this.pnum_] + ' est seul.';
  }
  tetriweb.Graphics.domWriteMessage(message);
  tetriweb.Graphics.updatePlayerList(this.players_, this.teams_,
      this.getModerator_());
  this.sendMessage_('team ' + this.pnum_ + ' ' + team);
};


/**
 * Pauses the game.
 */
tetriweb.Tetrinet.prototype.pauseGame = function() {
  this.sendMessage_('pause 1 ' + this.pnum_);
};


/**
 * Resumes the game.
 */
tetriweb.Tetrinet.prototype.resumeGame = function() {
  this.sendMessage_('pause 0 ' + this.pnum_);
};


/**
 * Pongs the proxy.
 */
tetriweb.Tetrinet.prototype.pong = function() {
  this.sendMessage_('pong');
};


/**
 * Notifies the server that we want to start a game.
 */
tetriweb.Tetrinet.prototype.startGame = function() {
  this.sendMessage_('startgame 1 ' + this.pnum_);
};


/**
 * Notifies the server that we want to stop the game.
 */
tetriweb.Tetrinet.prototype.stopGame = function() {
  this.sendMessage_('startgame 0 ' + this.pnum_);
};


/**
 * Sends a message on the partyline.
 * @param {string} msg The message to send.
 */
tetriweb.Tetrinet.prototype.sayPline = function(msg) {
  if (goog.string.trim(msg)) {
    if (msg.substr(0, 4) == '/me ') {
      this.sendMessage_('plineact ' + this.pnum_ + ' ' + msg.substr(4));
      tetriweb.Graphics.domWriteMessage(
          tetriweb.Graphics.htmlspecialchars(
              '* ' + this.players_[this.pnum_] + ' ' + msg.substr(4)));
    } else {
      this.sendMessage_('pline ' + this.pnum_ + ' ' + msg);
      tetriweb.Graphics.domWriteMessage(
          tetriweb.Graphics.htmlspecialchars(
              '<' + this.players_[this.pnum_] + '> ' + msg));
    }
  }
};


/**
 * Sends a message on the partyline.
 * @param {string} msg The message to send.
 */
tetriweb.Tetrinet.prototype.sayGmsg = function(msg) {
  if (msg.substr(0, 4) == '/me ') {
    this.sendMessage_('gmsg * ' + this.players_[this.pnum_] + ' ' +
        msg.substr(4));
  } else {
    this.sendMessage_('gmsg <' + this.players_[this.pnum_] + '> ' + msg);
  }
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
  this.logEvent('cs' + nblines, 0, this.pnum_);
  this.sendMessage_('sb 0 cs' + nblines + ' ' + this.pnum_);
};


/**
 * Sends a special to the given player.
 * @param {string} special The special to send.
 * @param {number} playerDest The player to whom the special is sent (0 = all).
 */
tetriweb.Tetrinet.prototype.sendSpecial = function(special, playerDest) {
  this.logEvent(special, playerDest, this.pnum_);
  this.sendMessage_('sb ' + playerDest + ' ' + special + ' ' + this.pnum_);
};


/**
 * Initializes a player's field.
 * @param {number} player_id The owner of the field we want to initialize.
 * @private
 */
tetriweb.Tetrinet.prototype.initField_ = function(player_id) {
  // Empty the whole field
  this.fields_[player_id] = new Array(tetriweb.Tetris.HEIGHT_);
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    this.fields_[player_id][l] = new Array(tetriweb.Tetris.WIDTH_);
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.fields_[player_id][l][c] = tetriweb.Tetris.BLOCK_EMPTY;
    }
  }

  tetriweb.Graphics.domInitField(player_id, this.players_[player_id]);
};


/**
 * Destroys a player's field.
 * @param {number} player_id The owner of the field we want to destroy.
 * @private
 */
tetriweb.Tetrinet.prototype.destroyField_ = function(player_id) {
  delete this.fields_[player_id];
  tetriweb.Graphics.domDestroyField(player_id);
};


/**
 * Clears a player's field.
 * @param {number} player_id The owner of the field we want to clear.
 * @private
 */
tetriweb.Tetrinet.prototype.clearField_ = function(player_id) {
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.setBlock_(player_id, c, l, tetriweb.Tetris.BLOCK_EMPTY);
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
  tetriweb.Graphics.domSetBlock(player_id, x, y, type);
};


/**
 * Sends the player's field to the server.
 * @param {Array.<Array.<number>>} field Current field to send.
 * @param {Array.<Array.<number>>} oldfield The old field.
 */
tetriweb.Tetrinet.prototype.sendField = function(field, oldfield) {
  // Initialize an array of differences indexed by block type
  var diff = [];
  var nbdiff = 0;
  for (var b = 0; b < tetriweb.Tetris.NB_BLOCKS; b++) {
    diff[b] = [];
  }

  // Find differences
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      if (field[l][c] != oldfield[l][c]) {
        diff[field[l][c]].push({'l': l, 'c': c});
        nbdiff++;
      }
    }
  }

  if (nbdiff > 0) {
    var f = 'f ' + this.pnum_ + ' ';

    // Incremental send
    var nb_blocks_diff = 0;
    for (var b = 0; b < diff.length; b++) {
      nb_blocks_diff += (diff[b].length > 0);
    }
    if (nb_blocks_diff + nbdiff * 2 <
        tetriweb.Tetris.WIDTH_ * tetriweb.Tetris.HEIGHT_) {
      for (var b = 0; b < diff.length; b++) {
        if (diff[b].length > 0) {
          // Output block type
          f += String.fromCharCode(b + '!'.charCodeAt(0));
          // Output new coordinates
          for (var i = 0; i < diff[b].length; i++) {
            f += String.fromCharCode(diff[b][i]['c'] + '3'.charCodeAt(0));
            f += String.fromCharCode(diff[b][i]['l'] + '3'.charCodeAt(0));
          }
        }
      }
    }
    // Send complete field
    else {
      for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
        for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
          f += tetriweb.Tetrinet.intToChar(field[l][c]);
        }
      }
    }
    this.sendMessage_(f);
  }
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
 * Returns the given player's field.
 * @param {number} playerNum The player we want to get the field.
 * @return {Array.<Array.<number>>} The player's field.
 */
tetriweb.Tetrinet.prototype.getPlayerField = function(playerNum) {
  return this.fields_[playerNum];
};


/**
 * Gets the scores array.
 * @return {Array.<Object.<string, string>>} The scores array.
 */
tetriweb.Tetrinet.prototype.getScores = function() {
  return this.scores_;
};


/**
 * Converts a block type to the matching integer type.
 * @param {string} type Character block type.
 * @return {number} Matching integer block type.
 */
tetriweb.Tetrinet.charToInt = function(type) {
  var specials = {'a': 6, 'c': 7, 'n': 8, 'r': 9, 's': 10, 'b': 11, 'g': 12,
    'q': 13, 'o': 14};
  var lastNormalBlockCode =
      '0'.charCodeAt(0) + tetriweb.Tetris.NB_NORMAL_BLOCKS - 1;
  if (type >= '0' && type <= String.fromCharCode(lastNormalBlockCode)) {
    type = parseInt(type, 10);
  } else if (specials[type] != undefined) {
    type = specials[type];
  }
  return type;
};


/**
 * Converts an integer block type to the matching character type.
 * @param {number} type Integer block type.
 * @return {string} Matching character block type.
 */
tetriweb.Tetrinet.intToChar = function(type) {
  var specials = {6: 'a', 7: 'c', 8: 'n', 9: 'r', 10: 's', 11: 'b', 12: 'g',
    13: 'q', 14: 'o'};
  if (specials[type] != undefined) {
    type = specials[type];
  }
  else {
    type = '' + type;
  }
  return type;
};


/**
 * @type {tetriweb.Tetris}
 */
tetriweb.Tetrinet.prototype.tetris = null;


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
tetriweb.Tetrinet.prototype.timer_;


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
 * @type {Array.<Object.<string, string>>}
 * @private
 */
tetriweb.Tetrinet.prototype.scores_ = null;


/**
 * @type {Array.<Array.<Array.<number>>>}
 * @private
 */
tetriweb.Tetrinet.prototype.fields_ = null;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetrinet.BLOCK_SIZE_OPP_ = 10;
