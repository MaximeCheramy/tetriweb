goog.require('goog.dom');

goog.provide('tetriweb.Graphics');



/**
 * Initializes the DOM elements needed by the game.
 * @param {number} pnum The player's playernum.
 * @param {string} nickname The player's nickname.
 * @param {boolean} moderator True if the player can start or stop games.
 */
tetriweb.Graphics.domInit = function(pnum, nickname, moderator) {
  // Empty fields container
  var fields = goog.dom.getElement('fields');
  goog.dom.removeChildren(fields);

  // Create event log
  tetriweb.Graphics.eventLog = goog.dom.createDom('div', {id: 'eventLog'});
  goog.dom.appendChild(fields, tetriweb.Graphics.eventLog);

  // Enable start button for moderators
  if (moderator) {
    goog.dom.getElement('startGame').disabled = false;
  }

  // Init the player's field
  var next = goog.dom.createDom('div', {id: 'nextpiece'});
  var specialBar = goog.dom.createDom('div', {id: 'specialbar'});
  var name = goog.dom.createDom('div', {id: 'myName'});
  goog.dom.setTextContent(name, pnum + ' - ' + nickname);
  var field = goog.dom.createDom('div', {id: 'myfield'});
  field.setAttribute('tabindex', 1);
  var cont = goog.dom.createDom('div', {id: 'mycontainer'},
      name, next, field, specialBar);
  goog.dom.appendChild(goog.dom.getElement('fields'), cont);
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
  var name = goog.dom.createDom('div', {className: 'fieldName'});
  goog.dom.setTextContent(name, player_id + ' - ' + nickname);
  goog.dom.appendChild(field, name);

  // Fill the field with empty blocks
  for (var l = 0; l < 22; l++) {
    for (var c = 0; c < 12; c++) {
      var block = goog.dom.createDom('div');
      block.className = 'small block ' + tetriweb.Tetris.convert(0);
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
  block.className = 'small block ' + tetriweb.Tetris.convert(type);
};


/**
 * @type {!Element}
 */
tetriweb.Graphics.eventLog = null;
