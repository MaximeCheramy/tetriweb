goog.require('goog.dom');
goog.require('goog.events');
goog.require('tetriweb.Tetrinet');
goog.require('tetriweb.Tetris');

goog.provide('tetriweb');


/**
 * Initializes Tetriweb.
 * Creates Tetrinet and Tetris objects, and sets up listeners.
 */
tetriweb.init = function() {
  var tetrinet = new tetriweb.Tetrinet();
  var tetris = new tetriweb.Tetris(tetrinet);
  var keyEvents = new tetriweb.KeyEvents(tetris);

  //* For debugging.
  window['tetrinet'] = tetrinet;
  window['tetris'] = tetris;
  //*/

  goog.events.listen(goog.dom.getElement('connect-form'),
      goog.events.EventType.SUBMIT, function(e) {
        e.preventDefault();
        tetrinet.connect(goog.dom.getElement('nickname').value,
            goog.dom.getElement('team').value);
      });

  goog.events.listen(goog.dom.getElement('partyline-form'),
      goog.events.EventType.SUBMIT, function(e) {
        e.preventDefault();
        var msg = goog.dom.getElement('msg');
        tetrinet.sayPline(msg.value);
        msg.value = '';
      });

  goog.events.listen(goog.dom.getElement('start-game'),
      goog.events.EventType.CLICK, function(e) {
        tetrinet.startGame();
      });

  goog.events.listen(window, 'beforeunload', function(e) {
    tetrinet.disconnect();
  });
};

goog.exportSymbol('tetriweb.init', tetriweb.init);
