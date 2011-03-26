goog.provide('tetriweb.Graphics');

goog.require('goog.dom');


/**
 * Initializes the DOM elements needed by the game.
 * @param {number} pnum The player's playernum.
 * @param {string} nickname The player's nickname.
 * @param {boolean} moderator True if the player can start or stop games.
 */
tetriweb.Graphics.domInit = function(pnum, nickname, moderator) {
  // Gets event log
  tetriweb.Graphics.eventLog = goog.dom.getElement('event-log');

  // Enable start button for moderators
  if (moderator) {
    // FIXME: If we lose this right the button should be disabled.
    goog.dom.getElement('start-game').disabled = false;
  }

  // Init the player's field
  tetriweb.Graphics.myField_ = goog.dom.getElement('my-field');
  tetriweb.Graphics.specialBar_ = goog.dom.getElement('special-bar');
};


/**
 * Shows the fields and hides the chat area.
 */
tetriweb.Graphics.displayFields = function() {
  goog.dom.classes.remove(goog.dom.getElement('fields'), 'hid');
  goog.dom.classes.add(goog.dom.getElement('chat-area'), 'hid');

  // TODO: Reroute the incoming messages to the log area.
};


/**
 * Shows the chat area and hided the fields.
 */
tetriweb.Graphics.displayChat = function() {
  goog.dom.classes.add(goog.dom.getElement('fields'), 'hid');
  goog.dom.classes.remove(goog.dom.getElement('chat-area'), 'hid');
};


/**
 * Displays an event in the event window.
 * @param {string} message The message to display.
 */
tetriweb.Graphics.domLogEvent = function(message) {
  var eventLog = tetriweb.Graphics.eventLog;
  var cont = goog.dom.createDom('div');
  goog.dom.setTextContent(cont, message);
  goog.dom.appendChild(eventLog, cont);
  eventLog.scrollTop = eventLog.scrollHeight; // scroll to bottom
};


/**
 * Writes a message on the partyline DOM element.
 * @param {string} msg The message to write.
 */
tetriweb.Graphics.domWritePline = function(msg) {
  var pline = goog.dom.getElement('partyline');
  var cont = goog.dom.createDom('div');
  goog.dom.setTextContent(cont, msg);
  goog.dom.appendChild(pline, cont);
  pline.scrollTop = pline.scrollHeight; // scroll to bottom
};


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
      block.style.top = l * (tetriweb.Tetrinet.BLOCK_SIZE_OPP_ + 1) + 1;
      block.style.left = c * (tetriweb.Tetrinet.BLOCK_SIZE_OPP_ + 1) + 1;
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
        block.style.top = (curY + l) * tetriweb.Graphics.BLOCK_SIZE_ + 1;
        block.style.left = (curX + c) * tetriweb.Graphics.BLOCK_SIZE_ + 1;
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
    special.style.left = i * tetriweb.Graphics.BLOCK_SIZE_ + 1;
    goog.dom.appendChild(tetriweb.Graphics.specialBar_, special);
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
        block.style.top = l * tetriweb.Graphics.BLOCK_SIZE_ + 1;
        block.style.left = c * tetriweb.Graphics.BLOCK_SIZE_ + 1;
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
        block.style.top = l * tetriweb.Graphics.BLOCK_SIZE_ + 1;
        block.style.left = c * tetriweb.Graphics.BLOCK_SIZE_ + 1;
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
        block.style.top = l * tetriweb.Graphics.BLOCK_SIZE_ + 1;
        block.style.left = c * tetriweb.Graphics.BLOCK_SIZE_ + 1;
        goog.dom.classes.set(block, 'block ' + convert(getColor(nextId)));
        goog.dom.appendChild(nextPieceObj, block);
      }
    }
  }
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
 * @type {number}
 * @private
 */
tetriweb.Graphics.BLOCK_SIZE_ = 20;


