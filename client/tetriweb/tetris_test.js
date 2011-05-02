goog.require('goog.testing.jsunit');
goog.require('goog.testing.net.XhrIo');
goog.require('goog.testing.recordConstructor');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.MockRandom');
goog.require('tetriweb.Graphics');
goog.require('tetriweb.KeyEvents');
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

function testCheckLine() {
  var clock = new goog.testing.MockClock(true);
  var random = new goog.testing.MockRandom([0.5, 0, 0, 0, 0, 0, .6, 0, 0, 0, 0, 0, 0, 0, 0], true);

  var tetrinet = new tetriweb.Tetrinet();
  var tetris = new tetriweb.Tetris(tetrinet);
  var keyEvents = new tetriweb.KeyEvents(tetris);
  tetrinet.connect('test', 'teamtest');
  // Connection succeed.
  var xhr = goog.net.XhrIo.getLastCall().getThis();
  xhr.simulateResponse(200, '{"pnum":1}');

  tetrinet.startGame();
  var xhr = tetrinet.xhr_in_;
  xhr.simulateResponse(200, '{"msg": ["newgame 0 1 2 1 1 1 18 3333333333333355555555555555222222222222222444444444444446666666666666677777777777777111111111111111 1111111111111111111111111111111122222222222222222234444444444455566666666666666788888899999999999999 1 1"]}');
  
  clock.tick(1001);
  tetris.tryToRotate();
  tetris.tryToRotate();
  tetris.tryToRotate();
  tetris.moveLeftOrRight(1);
  tetris.moveLeftOrRight(1);
  tetris.moveLeftOrRight(1);
  tetris.moveLeftOrRight(1);
  tetris.moveLeftOrRight(1);
  tetris.drop();
  clock.tick(1001);
  tetris.moveLeftOrRight(-1);
  tetris.moveLeftOrRight(-1);
  tetris.moveLeftOrRight(-1);
  tetris.moveLeftOrRight(-1);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  clock.tick(1001);
  tetris.tryToRotate();
  tetris.moveLeftOrRight(-1);
  tetris.moveLeftOrRight(-1);
  tetris.moveLeftOrRight(-1);
  tetris.moveLeftOrRight(-1);
  tetris.moveLeftOrRight(-1);
  tetris.drop();

  assertEquals(tetriweb.Tetris.BLOCK_RED, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][0]);
  assertEquals(tetriweb.Tetris.BLOCK_RED, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][1]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][2]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][3]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][4]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][5]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][6]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][7]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][8]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][9]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][10]);
  assertEquals(tetriweb.Tetris.BLOCK_PURPLE, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][11]);

  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][0]);
  assertEquals(tetriweb.Tetris.BLOCK_SB_A, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][1]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][2]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][3]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][4]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][5]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][6]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][7]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][8]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][9]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][10]);
  assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[tetriweb.Tetris.HEIGHT_ - 2][11]);

  for (var i = 0; i < tetriweb.Tetris.HEIGHT_ - 2; i++) {
    for (var j = 0; j < tetriweb.Tetris.WIDTH_; j++) {
      assertEquals(tetriweb.Tetris.BLOCK_EMPTY, tetris.gameArea_[i][j]);
    }
  }

  random.uninstall();
  clock.uninstall();
}

function testEndOfGameCollision() {
  var clock = new goog.testing.MockClock(true);

  var tetrinet = new tetriweb.Tetrinet();
  var tetris = new tetriweb.Tetris(tetrinet);
  var keyEvents = new tetriweb.KeyEvents(tetris);
  tetrinet.connect('test', 'teamtest');
  // Connection succeed.
  var xhr = goog.net.XhrIo.getLastCall().getThis();
  xhr.simulateResponse(200, '{"pnum":1}');

  // 1st game: only square blocks (11 blocks)
  var random = new goog.testing.MockRandom([0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0], true);
  tetrinet.startGame();
  var xhr = tetrinet.xhr_in_;
  xhr.simulateResponse(200, '{"msg": ["newgame 0 1 2 1 1 1 18 3333333333333355555555555555222222222222222444444444444446666666666666677777777777777111111111111111 1111111111111111111111111111111122222222222222222234444444444455566666666666666788888899999999999999 1 1"]}');
  
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  assertFalse(tetris.gameLost_);
  clock.tick(1001);
  assertTrue(tetris.gameLost_);

  var xhr = tetrinet.xhr_in_;
  xhr.simulateResponse(200, '{"msg": ["endgame"]}');

  // 2nd game: 10 square blocks and a L
  var random = new goog.testing.MockRandom([0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.2, 0, 0.4, 0], true);
  tetrinet.startGame();
  var xhr = tetrinet.xhr_in_;
  xhr.simulateResponse(200, '{"msg": ["newgame 0 1 2 1 1 1 18 3333333333333355555555555555222222222222222444444444444446666666666666677777777777777111111111111111 1111111111111111111111111111111122222222222222222234444444444455566666666666666788888899999999999999 1 1"]}');
  
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  clock.tick(1001);
  tetris.drop();
  assertFalse(tetris.gameLost_);
  clock.tick(1001);
  assertTrue(tetris.gameLost_);
  
  random.uninstall();
  clock.uninstall();
}
