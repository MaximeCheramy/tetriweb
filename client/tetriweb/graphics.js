goog.provide('tetriweb.Graphics');

goog.require('goog.dom');


/**
 * Initializes the DOM elements needed by the game.
 * @param {number} pnum The player's playernum.
 * @param {string} nickname The player's nickname.
 */
tetriweb.Graphics.domInit = function(pnum, nickname) {
  // Gets event log
  tetriweb.Graphics.eventLog = goog.dom.getElement('event-log');

  // Init the player's field
  tetriweb.Graphics.myField_ = goog.dom.getElement('my-field');
  tetriweb.Graphics.specialBar_ = goog.dom.getElement('special-bar');
  tetriweb.Graphics.playerList_ = goog.dom.getElement('player-list');

  tetriweb.Graphics.displayChat();
};


/**
 * Enable/disable moderator controls
 * @param {boolean} enable Whether enable or disable the controls.
 */
tetriweb.Graphics.enableModeratorControls = function(enable) {
  goog.dom.getElement('start-game').disabled = !enable;
  goog.dom.getElement('stop-game').disabled = !enable;
};


/**
 * Disables the player's field.
 */
tetriweb.Graphics.disableField = function() {
  var mask = goog.dom.createDom('div', {id: 'field-mask'});
  goog.dom.appendChild(goog.dom.getElement('my-field'), mask);
};


/**
 * Shows the fields and hides the chat area.
 */
tetriweb.Graphics.displayFields = function() {
  goog.dom.classes.remove(goog.dom.getElement('fields'), 'hid');
  goog.dom.classes.add(goog.dom.getElement('chat-area'), 'hid');

  tetriweb.Graphics.domWriteMessage = tetriweb.Graphics.domLogEvent;
};


/**
 * Shows the chat area and hides the fields.
 */
tetriweb.Graphics.displayChat = function() {
  goog.dom.classes.add(goog.dom.getElement('fields'), 'hid');
  goog.dom.classes.remove(goog.dom.getElement('chat-area'), 'hid');

  tetriweb.Graphics.domWriteMessage = tetriweb.Graphics.domWritePline;
};


/**
 * Show the login form and hides the fields and the chat area.
 */
tetriweb.Graphics.displayLoginForm = function() {
  goog.dom.classes.add(goog.dom.getElement('fields'), 'hid');
  goog.dom.classes.add(goog.dom.getElement('chat-area'), 'hid');
  tetriweb.Graphics.showLoginForm();  
}


/**
 * Sets the error message on the login form.
 */
tetriweb.Graphics.setErrorMessage = function(message) {
  var errorMessage = goog.dom.getElement('error-message');
  goog.dom.setTextContent(errorMessage, message);
  goog.dom.classes.remove(errorMessage, 'hid');
}


/**
 * Gives the focus to the event message input box.
 */
tetriweb.Graphics.eventMsgFocus = function() {
  goog.dom.getElement('event-msg').focus();
};


/**
 * Gives the focus to the game area.
 */
tetriweb.Graphics.gameAreaFocus = function() {
  goog.dom.getElement('my-field').focus();
};


/**
 * Displays an event in the event window.
 * @param {string} message The message to display.
 */
tetriweb.Graphics.domLogEvent = function(message) {
  var eventLog = tetriweb.Graphics.eventLog;
  var cont = goog.dom.createDom('div');
  cont.innerHTML = message;
  goog.dom.appendChild(eventLog, cont);
  eventLog.scrollTop = eventLog.scrollHeight; // scroll to bottom
};


/**
 * Escapes HTML special characters in a string.
 * @param {string} str The string to escape.
 */
tetriweb.Graphics.htmlspecialchars = function(str) {
   str = str.replace(/&/g, "&amp;");
   str = str.replace(/\"/g, "&quot;");
   str = str.replace(/\'/g, "&#039;");
   str = str.replace(/</g, "&lt;");
   str = str.replace(/>/g, "&gt;");
   return str;
};


/**
 * Highlights a nickname in a message.
 * @param {string} message The message.
 * @param {string} nick The nickname to highlight.
 */
tetriweb.Graphics.hlNick = function(message, nick) {
  var reg = new RegExp("\\b" + nick + "\\b", "g");
  message = tetriweb.Graphics.htmlspecialchars(message);
  return message.replace(reg, '<span class="hl">' + nick + '</span>');
};


/**
 * Writes a message on the partyline DOM element.
 * @param {string} msg The message to write.
 */
tetriweb.Graphics.domWritePline = function(msg) {
  var pline = goog.dom.getElement('partyline');
  var cont = goog.dom.createDom('div');
  cont.innerHTML = msg;
  goog.dom.appendChild(pline, cont);
  pline.scrollTop = pline.scrollHeight; // scroll to bottom
};


/**
 * Function to display a message to the user (pline or log)
 */
tetriweb.Graphics.domWriteMessage = tetriweb.Graphics.domWritePline;


/**
 * Creates an empty field in the DOM.
 * @param {number} player_id The field owner's pnum.
 * @param {string} nickname The field owner's nickname.
 */
tetriweb.Graphics.domInitField = function(player_id, nickname) {
  // Create a new field div and add it to the fields container
  var field = goog.dom.createDom('div', {className: 'field', id: 'field-' +
        player_id});
  goog.dom.appendChild(goog.dom.getElement('fields'), field);
  var name = goog.dom.createDom('div', {className: 'field-name'});
  goog.dom.setTextContent(name, player_id + ' - ' + nickname);
  goog.dom.appendChild(field, name);

  // Fill the field with empty blocks
  for (var l = 0; l < 22; l++) {
    for (var c = 0; c < 12; c++) {
      var block = goog.dom.createDom('div');
      goog.dom.classes.set(block, 'small block ' + tetriweb.Tetris.convert(0));
      block.id = 'block-' + player_id + '-' + l + '-' + c;
      block.style.top = l * (tetriweb.Tetrinet.BLOCK_SIZE_OPP_);
      block.style.left = c * (tetriweb.Tetrinet.BLOCK_SIZE_OPP_);
      goog.dom.appendChild(field, block);
    }
  }
};


/**
 * Removes a field from the DOM.
 * @param {number} player_id The field owner.
 */
tetriweb.Graphics.domDestroyField = function(player_id) {
  goog.dom.removeNode(goog.dom.getElement('field-' + player_id));
};


/**
 * Sets a block on a player's field.
 * @param {number} player_id The owner of the block.
 * @param {number} x The x-coordinate of the block.
 * @param {number} y The y-coordinate of the block.
 * @param {number} type The block type.
 */
tetriweb.Graphics.domSetBlock = function(player_id, x, y, type) {
  var block = goog.dom.getElement('block-' + player_id + '-' + y + '-' + x);
  goog.dom.classes.set(block, 'small block ' + tetriweb.Tetris.convert(type));
};


/**
 * Lays down a piece.
 * @param {number} curX The x-coordinate of the piece.
 * @param {number} curY The y-coordinate of the piece.
 * @param {Array.<Array.<number>>} current The current piece matrix to lay down.
 * @param {number} currentColor The color of the piece.
 */
tetriweb.Graphics.layDownPiece = function(curX, curY, current, currentColor) {
  var myField_ = tetriweb.Graphics.myField_;
  var currentObj_ = tetriweb.Graphics.currentObj_;
  var convert = tetriweb.Tetris.convert;
  for (var l = 0; l < 4; l++) {
    for (var c = 0; c < 4; c++) {
      if (current[l][c]) {
        var block = goog.dom.createDom('div');
        block.style.top = (curY + l) * tetriweb.Graphics.BLOCK_SIZE_;
        block.style.left = (curX + c) * tetriweb.Graphics.BLOCK_SIZE_;
        goog.dom.classes.set(block, 'block ' + convert(currentColor));
        goog.dom.appendChild(myField_, block);
      }
    }
  }
  goog.dom.removeNode(currentObj_);
};


/**
 * Updates the special bar displayed under the game field.
 * @param {Array.<number>} specialsQueue The specials queue to display.
 */
tetriweb.Graphics.updateSpecialBar = function(specialsQueue) {
  var convert = tetriweb.Tetris.convert;

  // Clear the bar...
  goog.dom.removeChildren(tetriweb.Graphics.specialBar_);
  // And fill it again !
  for (var i = 0; i < specialsQueue.length; i++) {
    var special = goog.dom.createDom('div');
    goog.dom.classes.set(special, 'block ' + convert(specialsQueue[i]));
    special.style.top = 0;
    special.style.left = i * tetriweb.Graphics.BLOCK_SIZE_;
    goog.dom.appendChild(tetriweb.Graphics.specialBar_, special);
  }
};


/**
 * Updates the player list.
 * @param {Array.<string>} players The player list.
 * @param {Array.<string>} teams The team list.
 */
tetriweb.Graphics.updatePlayerList = function(players, teams) {
  var first = true;
  // Clear the list...
  goog.dom.removeChildren(tetriweb.Graphics.playerList_);
  // And fill it again !
  for (var i = 0; i < players.length; i++) {
    if (players[i] != undefined) {
      var player = goog.dom.createDom('div');
      var nickNode;
      if (first) {
        nickNode = goog.dom.createDom('strong');
        goog.dom.setTextContent(nickNode, players[i]);
        first = false;
      } else {
        nickNode = goog.dom.createTextNode(players[i]);
        text = players[i];
      }
      goog.dom.appendChild(player, nickNode);
      if (teams[i] != undefined && teams[i] != '') {
        var teamNode = goog.dom.createTextNode(' (' + teams[i] + ')');
        goog.dom.appendChild(player, teamNode);
      }
      goog.dom.appendChild(tetriweb.Graphics.playerList_, player);
    }
  }
};


/**
 * Updates graphically the field using the internal matrix representing the
 * game.
 * @param {Array.<Array.<number>>} gameArea The game area matrix.
 */
tetriweb.Graphics.updateGrid = function(gameArea) {
  var convert = tetriweb.Tetris.convert;
  var myField_ = tetriweb.Graphics.myField_;
  var currentObj_ = tetriweb.Graphics.currentObj_;

  // Removes all the elements in the container.
  var fieldContent = goog.array.clone(myField_.childNodes);
  goog.array.forEach(fieldContent, function(n) {
    if (n != tetriweb.Graphics.currentObj_) {
      goog.dom.removeNode(n);
    }
  });

  // Rebuild the field.
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      if (gameArea[l][c] > 0) {
        var block = goog.dom.createDom('div');
        block.style.top = l * tetriweb.Graphics.BLOCK_SIZE_;
        block.style.left = c * tetriweb.Graphics.BLOCK_SIZE_;
        goog.dom.classes.set(block, 'block ' + convert(gameArea[l][c]));
        myField_.appendChild(block);
      }
    }
  }
};


/**
 * Updates the current piece by creating it and adding it to the field.
 * @param {Array.<Array.<number>>} current The current piece matrix to lay down.
 * @param {number} curX The x-coordinate of the piece.
 * @param {number} curY The y-coordinate of the piece.
 * @param {number} currentColor The color of the piece.
 */
tetriweb.Graphics.updatePiece = function(current, curX, curY, currentColor) {
  var convert = tetriweb.Tetris.convert;
  var myField_ = tetriweb.Graphics.myField_;
  var currentObj_ = tetriweb.Graphics.currentObj_;

  goog.dom.removeNode(currentObj_);

  tetriweb.Graphics.currentObj_ =
      goog.dom.createDom('div', {className: 'piece'});
  var currentObj_ = tetriweb.Graphics.currentObj_;
  tetriweb.Graphics.moveCurPieceH(curX);
  tetriweb.Graphics.moveCurPieceV(curY);
  goog.dom.appendChild(myField_, currentObj_);
  for (var l = 0; l < 4; l++) {
    for (var c = 0; c < 4; c++) {
      if (current[l][c]) {
        var block = goog.dom.createDom('div');
        block.style.top = l * tetriweb.Graphics.BLOCK_SIZE_;
        block.style.left = c * tetriweb.Graphics.BLOCK_SIZE_;
        goog.dom.classes.set(block, 'block ' + convert(currentColor));
        goog.dom.appendChild(currentObj_, block);
      }
    }
  }
};


/**
 * Takes the current piece element and update the blocks contained.
 * @param {Array.<Array.<number>>} nextPiece The next piece matrix.
 * @param {number} nextId The next piece ID.
 */
tetriweb.Graphics.updateNextPiece = function(nextPiece, nextId) {
  var convert = tetriweb.Tetris.convert;
  // That sucks.
  var getColor = tetriweb.Tetris.getColor;

  var nextPieceObj = goog.dom.getElement('next-piece');
  goog.dom.removeChildren(nextPieceObj);
  for (var l = 0; l < 4; l++) {
    for (var c = 0; c < 4; c++) {
      if (nextPiece[l][c]) {
        var block = goog.dom.createDom('div');
        block.style.top = l * tetriweb.Graphics.BLOCK_SIZE_ + 3;
        block.style.left = c * tetriweb.Graphics.BLOCK_SIZE_ + 3;
        goog.dom.classes.set(block, 'block ' + convert(getColor(nextId)));
        goog.dom.appendChild(nextPieceObj, block);
      }
    }
  }
};


/**
 * Sets the current level.
 * @param {number} level The current level.
 */
tetriweb.Graphics.setLevel = function(level) {
  var lvlElement = goog.dom.getElement('my-level');
  goog.dom.setTextContent(lvlElement, 'Level : ' + level.toString());
};


/**
 * Empties the game field.
 */
tetriweb.Graphics.emptyField = function() {
  goog.dom.removeChildren(tetriweb.Graphics.myField_);
};


/**
 * Moves the current piece to the given horizontal position.
 * @param {number} posX Horizontal coordinate.
 */
tetriweb.Graphics.moveCurPieceH = function(posX) {
  tetriweb.Graphics.currentObj_.style.left =
      posX * tetriweb.Graphics.BLOCK_SIZE_;
};


/**
 * Moves the current piece to the given vertical position.
 * @param {number} posY Vertical coordinate.
 */
tetriweb.Graphics.moveCurPieceV = function(posY) {
  tetriweb.Graphics.currentObj_.style.top =
      posY * tetriweb.Graphics.BLOCK_SIZE_;
};


/**
 * Hides the login form.
 */
tetriweb.Graphics.hideLoginForm = function() {
  var form = goog.dom.getElement('connect-form');
  var errorMessage = goog.dom.getElement('error-message');
  goog.dom.classes.add(form, 'hid');
  goog.dom.classes.add(errorMessage, 'hid');
};


/**
 * Shows the login form.
 */
tetriweb.Graphics.showLoginForm = function() {
  var form = goog.dom.getElement('connect-form');
  goog.dom.classes.remove(form, 'hid');
};


/**
 * Hides the pause and resume buttons.
 */
tetriweb.Graphics.enablePauseResumeButtons = function(enable) {
  var pauseButton = goog.dom.getElement('pause-game');
  var resumeButton = goog.dom.getElement('resume-game');

  pauseButton.disabled = !enable;
  resumeButton.disabled = !enable;
};


/**
 * Shows the pause button and hides the resume button.
 */
tetriweb.Graphics.showPauseButton = function() {
  var pauseButton = goog.dom.getElement('pause-game');
  var resumeButton = goog.dom.getElement('resume-game');

  goog.dom.classes.remove(pauseButton, 'hid');
  goog.dom.classes.add(resumeButton, 'hid');
};


/**
 * Shows the resume button and hides the pause button.
 */
tetriweb.Graphics.showResumeButton = function() {
  var pauseButton = goog.dom.getElement('pause-game');
  var resumeButton = goog.dom.getElement('resume-game');

  goog.dom.classes.remove(resumeButton, 'hid');
  goog.dom.classes.add(pauseButton, 'hid');
};


/**
 * @type {!Element}
 */
tetriweb.Graphics.eventLog = null;


/**
 * @type {!Element}
 * @private
 */
tetriweb.Graphics.myField_ = null;


/**
 * @type {!Element}
 * @private
 */
tetriweb.Graphics.currentObj_ = null;


/**
 * @type {!Element}
 * @private
 */
tetriweb.Graphics.specialBar_ = null;


/**
 * @type {!Element}
 * @private
 */
tetriweb.Graphics.playerList_ = null;


/**
 * @type {number}
 * @private
 */
tetriweb.Graphics.BLOCK_SIZE_ = 20;


