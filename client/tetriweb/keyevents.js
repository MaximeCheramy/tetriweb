goog.provide('tetriweb.KeyEvents');

goog.require('goog.events');
goog.require('goog.events.KeyHandler');
goog.require('tetriweb.Graphics');
goog.require('tetriweb.Tetris');



/**
 * @constructor
 * @param {tetriweb.Tetris} tetris The tetris object.
 */
tetriweb.KeyEvents = function(tetris) {
  this.tetris_ = tetris;
  this.tetris_.keyEvents = this;
};


/**
 * Sets up the key event handler.
 */
tetriweb.KeyEvents.prototype.setKeyEvent = function() {
  this.disposeKeyEvent();
  var keyHandler = new goog.events.KeyHandler(tetriweb.Graphics.myField_);
  goog.events.listen(keyHandler, goog.events.KeyHandler.EventType.KEY,
      goog.bind(this.keyHandler_, this));
};


/**
 * Disposes the key event handler.
 */
tetriweb.KeyEvents.prototype.disposeKeyEvent = function() {
  goog.events.removeAll(tetriweb.Graphics.myField_);
};


/**
 * Key handler used to move the pieces or send actions.
 * @param {object} e The key event.
 * @private
 */
tetriweb.KeyEvents.prototype.keyHandler_ = function(e) {
  // Prevent the browser from handling the event
  e.preventDefault();

  // Do nothing if game is lost
  if (this.tetris_.isGameLost()) return;

  // Key codes constants
  var keys = goog.events.KeyCodes;

  if (e.keyCode == keys.UP) {
    this.tetris_.tryToRotate();
  } else if (e.keyCode == keys.RIGHT || e.keyCode == keys.LEFT) {
    this.tetris_.moveLeftOrRight((e.keyCode == keys.RIGHT) ? 1 : -1);
  } else if (e.keyCode == keys.DOWN) {
    this.tetris_.moveDown();
  } else if (e.charCode == keys.SPACE) {
    this.tetris_.drop();
  } else if (e.keyCode >= keys.ONE && e.keyCode <= keys.SIX) {
    this.tetris_.useSpecial(e.keyCode - keys.ZERO);
  } else if (e.keyCode == keys.D) {
    this.tetris_.deleteSpecial();
  } else if (e.keyCode == keys.T) {
    tetriweb.Graphics.eventMsgFocus();
  }
};

/**
 * @type tetriweb.Tetris
 * @private
 */
tetriweb.KeyEvents.prototype.tetris_ = null;
