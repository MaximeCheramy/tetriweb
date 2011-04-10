goog.require('tetriweb.Graphics');
goog.require('tetriweb.Tetris');
goog.require('tetriweb.Tetrinet');
goog.require('goog.testing.jsunit');

function setUp() {
  var next = goog.dom.createDom('div', {id: 'nextpiece'});
  var specialBar = goog.dom.createDom('div', {id: 'specialbar'});
  var name = goog.dom.createDom('div', {id: 'myName'});
  var field = goog.dom.createDom('div', {id: 'myfield'});
  field.setAttribute('tabindex', 1);
  var cont = goog.dom.createDom('div', {id: 'mycontainer'},
      name, next, field, specialBar);
  goog.dom.appendChild(goog.dom.getElement('fields'), cont);

}

function testInit() {
  var tetrinet = new tetriweb.Tetrinet();

  var tetris = new tetriweb.Tetris(tetrinet);
  var piecesFreq = '1111111111111111122222222222223333333333333334444444444555555555555555566666666666777777777777777777';
  var specialsFreq = '1111111111111122222222223333333333334444444445555555555555666666666677777777777777888888888889999999';

  tetris.init(1, 1, 10, piecesFreq, specialsFreq);

  assertFalse(tetris.gameLost_);
}
