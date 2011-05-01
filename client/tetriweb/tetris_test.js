goog.require('goog.testing.jsunit');
goog.require('goog.testing.net.XhrIo');
goog.require('goog.testing.recordConstructor');
goog.require('tetriweb.Graphics');
goog.require('tetriweb.Tetrinet');
goog.require('tetriweb.Tetris');

function setUp() {
  goog.net.XhrIo = goog.testing.recordConstructor(goog.testing.net.XhrIo);
}

function testConnect() {
  var tetrinet = new tetriweb.Tetrinet();

  tetrinet.connect('test', 'teamtest');

  // Connection succeed.
  var xhr = goog.net.XhrIo.getLastCall().getThis();
  xhr.simulateResponse(200, '{"pnum":1}');

  // Check playerExists.
  assertTrue(tetrinet.playerExists(1));
  assertFalse(tetrinet.playerExists(0));
  assertFalse(tetrinet.playerExists(2));

  // Hide the connect form and display the chat-area.
  assertTrue(goog.dom.classes.has(goog.dom.getElement('connect-form'), 'hid'));
  assertFalse(goog.dom.classes.has(goog.dom.getElement('chat-area'), 'hid'));

  // PlayerList must contains only one connected user.
  assertEquals(goog.dom.getElement('player-list').children.length, 1);
}
