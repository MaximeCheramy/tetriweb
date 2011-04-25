goog.require('goog.testing.jsunit');
goog.require('tetriweb.Graphics');
goog.require('tetriweb.Tetrinet');
goog.require('tetriweb.Tetris');

function setUp() {
}

function testConnect() {
  var tetrinet = new tetriweb.Tetrinet();

  // TODO: overrider ce qu'il faut pour éviter de devoir communiquer avec le serveur.
  tetrinet.connect('test', 'teamtest');
}
