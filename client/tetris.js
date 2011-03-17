goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.KeyHandler');
goog.require('goog.math');

goog.provide('tetriweb.Tetris');



/**
 * Tetris Class.
 * @param {object} tetrinet The tetrinet objet used to communicate with the
 * tetrinet server.
 * @constructor
 */
tetriweb.Tetris = function(tetrinet) {
  this.tetrinet_ = tetrinet;
  this.tetrinet_.tetris = this;
  this.gameArea_ = new Array(tetriweb.Tetris.HEIGHT_);
};


tetriweb.Tetris.prototype.setKeyEvent_ = function() {
  goog.events.removeAll(this.myField_);
  var keyHandler = new goog.events.KeyHandler(this.myField_);
  goog.events.listen(keyHandler, goog.events.KeyHandler.EventType.KEY,
      goog.bind(this.keyHandler_, this));
};


/**
 * Initializes the game.
 * @param {number} _specialLines The number of lines required to get a special.
 * @param {number} _specialCount The number of specials added each time
 * _specialLines are completed.
 * @param {number} _specialCapacity The capacity of the specials queue.
 * @param {string} _piecesFreq Occurence frequencies of each block.
 * @param {string} _specialsFreq Occurence frequencies of each special.
 * @private
 */
tetriweb.Tetris.prototype.init_ = function(_specialLines, _specialCount,
    _specialCapacity, _piecesFreq, _specialsFreq) {
  // init the game area : all empty.
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    this.gameArea_[l] = new Array(tetriweb.Tetris.WIDTH_);
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.gameArea_[l][c] = 0;
    }
  }
  // TODO: To move.
  this.emptyField_();

  this.gameLost_ = false;
  // Pieces' frequency.
  this.piecesFreq_ = goog.array.repeat(0, 7);
  for (var i = 0; i < _piecesFreq.length; i++) {
    this.piecesFreq_[parseInt(_piecesFreq[i]) - 1]++;
  }

  // Specials' frequency.
  this.specialsFreq_ = goog.array.repeat(0, 9);
  for (var i = 0; i < _specialsFreq.length; i++) {
    this.specialsFreq_[parseInt(_specialsFreq[i]) - 1]++;
  }

  this.specialLines_ = _specialLines;
  this.specialCount_ = _specialCount;
  this.specialCapacity_ = _specialCapacity;
  this.currentSpecialLines_ = 0;
  this.specialsQueue_ = [];
};


/**
 * Starts a new game.
 * @param {number} _specialLines The number of lines required to get a special.
 * @param {number} _specialCount The number of specials added each time
 * _specialLines are completed.
 * @param {number} _specialCapacity The capacity of the specials queue.
 * @param {string} _piecesFreq Occurence frequencies of each block.
 * @param {string} _specialsFreq Occurence frequencies of each special.
 */
tetriweb.Tetris.prototype.startGame = function(_specialLines, _specialCount,
    _specialCapacity, _piecesFreq, _specialsFreq) {
  this.init_(_specialLines, _specialCount, _specialCapacity, _piecesFreq,
      _specialsFreq);

  this.updateGridAndSendField_();
  this.generateRandom_();
  this.newPiece_();
  this.stepTimer = window.setTimeout(goog.bind(this.step_, this), 1000);

  // TODO: To move.
  this.setKeyEvent_();
};


/**
 * Generates a random block.
 * @private
 */
tetriweb.Tetris.prototype.generateRandom_ = function() {
  var convert = tetriweb.Tetris.convert;
  var getColor = tetriweb.Tetris.getColor;
  var randomInt = tetriweb.Tetris.randomInt;

  var n = randomInt(0, 99);
  this.nextId_ = 0; // prochaine pièce
  while (n >= this.piecesFreq_[this.nextId_]) {
    n -= this.piecesFreq_[this.nextId_];
    this.nextId_++;
  }
  this.nextDirection_ = randomInt(0, 3); // orientation de la pièce

  var nextPiece = tetriweb.Tetris.generatePiece(
      this.nextId_, this.nextDirection_);

  // TODO
  this.updateNextPiece(nextPiece);
};


/**
 * Checks for complete lines. Complete lines will be removed and create new
 * bonus or add lines to opponents.
 * @param {boolean} cleanupOnly If true, do not take specials nor send lines.
 * @private
 */
tetriweb.Tetris.prototype.checkLine_ = function(cleanupOnly) {
  var nbLines = 0;
  var tmpSpecials = [];
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    var tetris = true;
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      tetris = tetris && (this.gameArea_[l][c] > 0);
    }
    if (tetris) {
      nbLines++;
      // Take specials
      for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
        if (this.gameArea_[l][c] > 5) {
          tmpSpecials.push(this.gameArea_[l][c]);
        }
      }
      for (var ll = l; ll > 0; ll--) {
        for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
          this.gameArea_[ll][c] = this.gameArea_[ll - 1][c];
        }
      }
      for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
        this.gameArea_[0][c] = 0;
      }
    }
  }
  this.updateGridAndSendField_();

  if (!cleanupOnly) {
    if (nbLines == 4) {
      this.tetrinet_.sendLines(nbLines);
    } else if (nbLines > 1) {
      this.tetrinet_.sendLines(nbLines - 1);
    }

    this.handleSpecials_(nbLines, tmpSpecials);
  }
};


/**
 * Handles specials after complete lines cleanup.
 * @param {number} nbLines The number of complete lines.
 * @param {Array.<number>} specials The special blocks of these lines.
 * @private
 */
tetriweb.Tetris.prototype.handleSpecials_ = function(nbLines, specials) {
  // Take each special nbLines times
  for (var i = 0; i < specials.length &&
      this.specialsQueue_.length < this.specialCapacity_; i++) {
    for (var j = 0; j < nbLines &&
        this.specialsQueue_.length < this.specialCapacity_; j++) {
      this.specialsQueue_.push(specials[i]);
    }
  }
  this.updateSpecialBar_();

  // Increment counters and place special blocks on the field
  this.currentSpecialLines_ += nbLines;
  var nbSpecials = this.currentSpecialLines_ / this.specialLines_;
  this.placeSpecials_(nbSpecials * this.specialCount_);
  this.currentSpecialLines_ %= this.specialLines_;
};


/**
 * Updates the special bar displayed under the game field.
 * @private
 */
tetriweb.Tetris.prototype.updateSpecialBar_ = function() {
  var convert = tetriweb.Tetris.convert;

  // Clear the bar...
  var specialBar = goog.dom.getElement('specialbar');
  goog.dom.removeChildren(specialBar);
  // And fill it again !
  for (var i = 0; i < this.specialsQueue_.length; i++) {
    var special = goog.dom.createDom('div');
    special.className = 'block ' + convert(this.specialsQueue_[i]);
    special.style.top = 0;
    special.style.left = i * tetriweb.Tetris.BLOCK_SIZE_ + 1;
    goog.dom.appendChild(specialBar, special);
  }
};


/**
 * Places nb special blocks on the field.
 * @param {number} nb The number of blocks to place.
 * @private
 */
tetriweb.Tetris.prototype.placeSpecials_ = function(nb) {
  var randomInt = tetriweb.Tetris.randomInt;

  // Count number of blocks available
  var availBlocks = 0;
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      if (this.gameArea_[l][c] > 0 && this.gameArea_[l][c] <= 5) {
        availBlocks++;
      }
    }
  }

  // Can't place more blocks than available
  var blocksToPlace = Math.min(nb, availBlocks);

  // Generate and place blocks randomly
  for (var i = 0; i < blocksToPlace; i++) {
    // Choose special type
    var n = randomInt(0, 99);
    var special = 0;
    while (n >= this.specialsFreq_[special]) {
      n -= this.specialsFreq_[special];
      special++;
    }
    special += 6;

    // Choose place on the field (nth available block)
    var place = randomInt(0, availBlocks - i - 1);
    for (var l = 0; place >= 0 && l < tetriweb.Tetris.HEIGHT_; l++) {
      for (var c = 0; place >= 0 && c < tetriweb.Tetris.WIDTH_; c++) {
        if (this.gameArea_[l][c] > 0 && this.gameArea_[l][c] <= 5) {
          if (place == 0) {
            this.gameArea_[l][c] = special;
          }
          place--;
        }
      }
    }
  }

  // Update the grid if it has changed
  if (blocksToPlace > 0) {
    this.updateGridAndSendField_();
  }
};


tetriweb.Tetris.prototype.layDownPiece = function() {
  var convert = tetriweb.Tetris.convert;
  for (var l = 0; l < 4; l++) {
    for (var c = 0; c < 4; c++) {
      if (this.current_[l][c]) {
        this.gameArea_[l + this.curY_][c + this.curX_] = this.currentColor_;
        var bloc = goog.dom.createDom('div');
        bloc.style.top = (this.curY_ + l) * tetriweb.Tetris.BLOCK_SIZE_ + 1;
        bloc.style.left = (this.curX_ + c) * tetriweb.Tetris.BLOCK_SIZE_ + 1;
        bloc.className = 'block ' + convert(this.currentColor_);
        goog.dom.appendChild(this.myField_, bloc);
      }
    }
  }
  goog.dom.removeNode(this.currentObj_);
};


/**
 * Game Engine. This function is called periodicaly.
 * @private
 */
tetriweb.Tetris.prototype.step_ = function() {
  //TODO: Commenter le workflow du moteur de jeu.

  var stop = false;
  for (var l = 0; l < 4 && !stop; l++) {
    for (var c = 0; c < 4 && !stop; c++) {
      if (this.current_[l][c]) {
        if (l + this.curY_ + 1 >= tetriweb.Tetris.HEIGHT_ ||
            this.gameArea_[l + this.curY_ + 1][c + this.curX_] > 0) {
          stop = true;
        }
      }
    }
  }
  if (!stop) {
    this.curY_++;
    this.moveCurPieceV_(this.curY_);
  } else {
    if (this.curY_ <= 0) {
      this.gameLost_ = true;
    }

    this.layDownPiece();   

    this.pieceDropped_ = true;
    this.checkLine_();
    this.sendField_();
    this.newPiece_();
  }
  if (this.gameLost_) {
    this.tetrinet_.sendPlayerlost();
    this.fillRandomly_();
  } else {
    clearTimeout(this.stepTimer);
    this.stepTimer = window.setTimeout(goog.bind(this.step_, this), 1000);
  }
};


/**
 * Key handler used to move the pieces or send actions.
 * @param {object} e The key event.
 * @private
 */
tetriweb.Tetris.prototype.keyHandler_ = function(e) {
  // TODO: Séparer en plusieurs fonctions.

  // Stop la propagation de l'event.
  e.preventDefault();

  // Si la partie est perdue alors on ne fait rien.
  if (this.gameLost_) return;

  var keys = goog.events.KeyCodes;

  // Touche haut
  if (e.keyCode == keys.UP) {
    var piece = tetriweb.Tetris.rotate_(this.current_);

    // verifie si new ok.
    var ok = false;
    // On tente plusieurs décalages en x pour tourner contre des obstacles
    // 0 = pas de décalage, 1 = un cran à droite, -1 = un cran à gauche...
    // TODO: visiblement 2 ne sert jamais, et 3 que pour les linebar.
    // Optimisable donc...
    var delta_x = [0, 1, -1, 2, -2, 3, -3];
    var dx = 0;
    for (dx = 0; dx < delta_x.length && !ok; dx++) {
      ok = true;
      for (var l = 0; l < 4 && ok; l++) {
        for (var c = 0; c < 4 && ok; c++) {
          if (piece[l][c]) {
            var newL = this.curY_ + l;
            var newC = this.curX_ + delta_x[dx] + c;
            ok = newC >= 0 &&
                 newC < tetriweb.Tetris.WIDTH_ &&
                 newL >= 0 &&
                 newL < tetriweb.Tetris.HEIGHT_ &&
                 this.gameArea_[newL][newC] == 0;
          }
        }
      }
    }
    dx--;

    if (ok) {
      this.curX_ += delta_x[dx];
      this.current_ = piece;
      goog.dom.removeNode(this.currentObj_);
      this.updatePiece_();
    }
  }

  // Touche droite ou gauche
  if (e.keyCode == keys.RIGHT || e.keyCode == keys.LEFT) {
    var shift = (e.keyCode == keys.RIGHT) ? 1 : -1; // sens de déplacement
    var ok = true;
    for (var l = 0; l < 4 && ok; l++) {
      for (var c = 0; c < 4 && ok; c++) {
        ok = !this.current_[l][c] ||
            (c + this.curX_ + shift >= 0 &&
            c + this.curX_ + shift < tetriweb.Tetris.WIDTH_ &&
            !this.gameArea_[l + this.curY_][c + this.curX_ + shift]);
      }
    }
    if (ok) {
      this.curX_ += shift;
    }
  }

  // Touche bas.
  if (e.keyCode == keys.DOWN) {
    clearTimeout(this.stepTimer);
    this.step_();
  }

  // Touche espace.
  if (e.charCode == keys.SPACE) {
    this.pieceDropped_ = false;
    while (!this.pieceDropped_) {
      this.step_();
    }
  }

  // Envoi bonus (touches 1 à 6 haut du clavier)
  if (e.keyCode >= keys.ONE && e.keyCode <= keys.SIX &&
      this.specialsQueue_.length > 0) {
    var convert = tetriweb.Tetris.convert;
    var playerNum = e.keyCode - keys.ZERO;
    if (this.tetrinet_.playerExists(playerNum)) {
      var specialName = convert(this.specialsQueue_.shift()).substring(3);
      this.tetrinet_.sendSpecial(specialName, playerNum);
      if (playerNum == this.tetrinet_.getMyPlayerNum() || specialName == 's') {
        switch (specialName) {
          case 'a':
            this.addLine();
            break;
          case 'b':
            this.clearSpecialBlocks();
            break;
          case 'c':
            this.clearLine();
            break;
          case 'g':
            this.blockGravity();
            break;
          case 'n':
            this.nukeField();
            break;
          case 'o':
            this.blockBomb();
            break;
          case 'q':
            this.blockQuake();
            break;
          case 'r':
            this.randomClearBlocks();
            break;
          case 's':
            this.switchFields(playerNum);
            break;
        }
      }
      this.updateSpecialBar_();
    }
  }

  // Delete bonus (d)
  if (e.keyCode == keys.D) {
    this.specialsQueue_.shift();
    this.updateSpecialBar_();
  }

  this.moveCurPieceH_(this.curX_);
};



/**
 * Genere une piece.
 * @param {number} id Identifiant de la piece.
 * @param {number} orientation Nombre de rotation de 90 degres sens horaire.
 * @return {Array.<Array.<boolean>>} La matrice qui represente la piece.
 */
tetriweb.Tetris.generatePiece = function(id, orientation) {
  var piece = new Array(4);

  switch (id) {
    case 0:
      piece[0] = new Array(false, false, false, false);
      piece[1] = new Array(true, true, true, true);
      piece[2] = new Array(false, false, false, false);
      piece[3] = new Array(false, false, false, false);
      break;
    case 1:
      piece[0] = new Array(false, false, false, false);
      piece[1] = new Array(false, true, true, false);
      piece[2] = new Array(false, true, true, false);
      piece[3] = new Array(false, false, false, false);
      break;
    case 2:
      piece[0] = new Array(false, true, false, false);
      piece[1] = new Array(false, true, false, false);
      piece[2] = new Array(true, true, false, false);
      piece[3] = new Array(false, false, false, false);
      break;
    case 3:
      piece[0] = new Array(true, false, false, false);
      piece[1] = new Array(true, false, false, false);
      piece[2] = new Array(true, true, false, false);
      piece[3] = new Array(false, false, false, false);
      break;
    case 4:
      piece[0] = new Array(false, false, false, false);
      piece[1] = new Array(true, true, false, false);
      piece[2] = new Array(false, true, true, false);
      piece[3] = new Array(false, false, false, false);
      break;
    case 5:
      piece[0] = new Array(false, false, false, false);
      piece[1] = new Array(false, true, true, false);
      piece[2] = new Array(true, true, false, false);
      piece[3] = new Array(false, false, false, false);
      break;
    case 6:
      piece[0] = new Array(false, true, false, false);
      piece[1] = new Array(true, true, true, false);
      piece[2] = new Array(false, false, false, false);
      piece[3] = new Array(false, false, false, false);
      break;
  }

  while (orientation > 0) {
    piece = tetriweb.Tetris.rotate_(piece);
    orientation--;
  }

  return piece;
};


/**
 * Rotation d'une piece de 90° dans le sens horaire.
 * @param {Array.<Array.<number>>} piece La piece que l'on veut faire pivoter.
 * @return {Array.<Array.<number>>} La piece retournée.
 * @private
 */
tetriweb.Tetris.rotate_ = function(piece) {
  // Rotation de la piece.
  var npiece = new Array(4);
  for (var l = 0; l < 4; l++) {
    npiece[l] = new Array(4);
    for (var c = 0; c < 4; c++) {
      npiece[l][c] = piece[3 - c][l];
    }
  }

  // Deplacement de la piece en haut a gauche.
  var done_t = false, done_l = false;
  do {
    done_t = npiece[0][0] || npiece[0][1] || npiece[0][2] || npiece[0][3];
    if (!done_t) {
      for (var l = 0; l < 3; l++) {
        for (var c = 0; c < 4; c++) {
          npiece[l][c] = npiece[l + 1][c];
        }
      }
      for (var c = 0; c < 4; c++) {
        npiece[3][c] = false;
      }
    }
    done_l = npiece[0][0] || npiece[1][0] || npiece[2][0] || npiece[3][0];
    if (!done_l) {
      for (var l = 0; l < 4; l++) {
        for (var c = 0; c < 3; c++) {
          npiece[l][c] = npiece[l][c + 1];
        }
      }
      for (var l = 0; l < 4; l++) {
        npiece[l][3] = false;
      }
    }
  } while (!(done_l && done_t));

  // Retourne la nouvelle piece.
  return npiece;
};


/**
 * Génération d'un entier pseudo-aléatoire appartenant à [|min, max|]
 * @param {number} min Borne inferieure.
 * @param {number} max Borne superieure.
 * @return {number} Un nombre entre min et max compris.
 */
tetriweb.Tetris.randomInt = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};


/**
 * Convertion d'un code couleur vers un nom de couleur.
 * @param {number} color Identifiant de couleur.
 * @return {string} Classe.
 */
tetriweb.Tetris.convert = function(color) {
  switch (color) {
    case 0: return 'empty';
    case 1: return 'blue';//return '#0000FF'; // bleu
    case 2: return 'yellow';//return '#FFFF00'; // jaune
    case 3: return 'green';//return '#00FF00'; // vert
    case 4: return 'purple';//return '#800080'; // violet
    case 5: return 'red';//return '#FF0000'; // rouge
    case 6: return 'sb-a';
    case 7: return 'sb-c';
    case 8: return 'sb-n';
    case 9: return 'sb-r';
    case 10: return 'sb-s';
    case 11: return 'sb-b';
    case 12: return 'sb-g';
    case 13: return 'sb-q';
    case 14: return 'sb-o';
    default: alert('unknown block ' + typeof(color) + ' ' + color);
  }
};


/**
 * Retourne le code couleur pour un identifiant de piece donné.
 * @param {number} id Identifiant de la piece.
 * @return {number} Code couleur.
 */
tetriweb.Tetris.getColor = function(id) {
  switch (id) {
    case 0: return 1; // barre : bleu
    case 1: return 2; // carré : jaune
    case 2: return 3; // L gauche : vert
    case 3: return 4; // L droite : violet
    case 4: return 5; // Z : rouge
    case 5: return 1; // Z inversé : bleu
    case 6: return 2; // T : jaune
    default: return id;
  }
};




//
// Actions
//


/**
 * Add a line at the bottom of the grid.
 */
tetriweb.Tetris.prototype.addLine = function() {
  for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
    if (this.gameArea_[0][c] > 0) {
      this.gameLost_ = true;
    }
  }
  if (!this.gameLost_) {
    var randomInt = tetriweb.Tetris.randomInt;
    // On decale tout vers le haut.
    for (var l = 1; l < tetriweb.Tetris.HEIGHT_; l++) {
      for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
        this.gameArea_[l - 1][c] = this.gameArea_[l][c];
      }
    }

    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][c] = randomInt(1, 5);
    }
    var r = randomInt(0, tetriweb.Tetris.WIDTH_ - 1);
    this.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][r] = 0;
    this.updateGridAndSendField_();
  }
};


/**
 * Removes the last line.
 */
tetriweb.Tetris.prototype.clearLine = function() {
  // On décale tout vers le bas.
  for (var l = tetriweb.Tetris.HEIGHT_ - 1; l > 0; l--) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.gameArea_[l][c] = this.gameArea_[l - 1][c];
    }
  }
  this.updateGridAndSendField_();
};


/**
 * Block gravity (The blocks fall).
 */
tetriweb.Tetris.prototype.blockGravity = function() {
  for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
    var curLine = tetriweb.Tetris.HEIGHT_ - 1;
    for (var l = tetriweb.Tetris.HEIGHT_ - 1; l >= 0; l--) {
      if (this.gameArea_[l][c] > 0) {
        if (l != curLine) {
          this.gameArea_[curLine][c] = this.gameArea_[l][c];
          this.gameArea_[l][c] = 0;
        }
        curLine--;
      }
    }
  }
  this.checkLine_(true);
  this.updateGridAndSendField_();
};


/**
 * Deletes 10 random blocks on the field.
 */
tetriweb.Tetris.prototype.randomClearBlocks = function() {
  var randomInt = tetriweb.Tetris.randomInt;
  for (var i = 0; i < 10; i++) {
    this.gameArea_[randomInt(0, 21)][randomInt(0, 11)] = 0;
  }
  this.updateGridAndSendField_();
};


/**
 * Shifts all the lines of the field.
 */
tetriweb.Tetris.prototype.blockQuake = function() {
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    var oldLine = goog.array.clone(this.gameArea_[l]);
    var shift = tetriweb.Tetris.randomInt(1, 3);
    var sign = tetriweb.Tetris.randomInt(0, 1);
    if (sign) {
      shift *= -1;
    }
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.gameArea_[l][c] =
          oldLine[goog.math.modulo(c - shift, tetriweb.Tetris.WIDTH_)];
    }
  }
  this.updateGridAndSendField_();
};


/**
 * Switch fields with another player.
 * @param {number} playerNum The player to switch fields with.
 */
tetriweb.Tetris.prototype.switchFields = function(playerNum) {
  playerField = (playerNum == this.tetrinet_.getMyPlayerNum()) ?
      this.gameArea_ : this.tetrinet_.getPlayerField(playerNum);
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.gameArea_[l][c] = (l < 6) ? 0 : playerField[l][c];
    }
  }
  this.updateGridAndSendField_();
};


/**
 * Clears all special blocks of the field.
 */
tetriweb.Tetris.prototype.clearSpecialBlocks = function() {
  var randomInt = tetriweb.Tetris.randomInt;
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      if (this.gameArea_[l][c] > 5) {
        this.gameArea_[l][c] = randomInt(1, 5);
      }
    }
  }
  this.updateGridAndSendField_();
};


/**
 * Explodes O blocks on the field.
 */
tetriweb.Tetris.prototype.blockBomb = function() {
  // Relative coordinates of the 8 blocks around a block
  var dep = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]];
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      // Look for block bombs
      if (this.gameArea_[l][c] == 14) { // TODO: constant
        // Remove bomb
        this.gameArea_[l][c] = 0;
        // Explode the blocks around
        for (var d = 0; d < dep.length; d++) {
          var ll = l + dep[d][0];
          var cc = c + dep[d][1];
          if (ll >= 0 && ll < tetriweb.Tetris.HEIGHT_ &&
              cc >= 0 && cc < tetriweb.Tetris.WIDTH_) {
            if (this.gameArea_[ll][cc] != 14) {
              // New random coordinates
              var randomInt = tetriweb.Tetris.randomInt;
              var newL = randomInt(6, tetriweb.Tetris.HEIGHT_ - 1);
              var newC = randomInt(0, tetriweb.Tetris.WIDTH_ - 1);
              this.gameArea_[newL][newC] = this.gameArea_[ll][cc];
            }
          }
        }
      }
    }
  }
  this.updateGridAndSendField_();
};


/**
 * Empty the field (nuke).
 */
tetriweb.Tetris.prototype.nukeField = function() {
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.gameArea_[l][c] = 0;
    }
  }
  this.updateGridAndSendField_();
};


/**
 * Fills the field with random blocks. To be used when the game is lost.
 * @private
 */
tetriweb.Tetris.prototype.fillRandomly_ = function() {
  var randomInt = tetriweb.Tetris.randomInt;
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.gameArea_[l][c] = randomInt(1, 5);
    }
  }
  this.updateGridAndSendField_();
};


/**
 * Generates a new piece.
 * @private
 */
tetriweb.Tetris.prototype.newPiece_ = function() {
  var getColor = tetriweb.Tetris.getColor;
  // temp.
  this.curX_ = 5;
  this.curY_ = 0;

  this.current_ = tetriweb.Tetris.generatePiece(this.nextId_,
      this.nextDirection_);
  this.currentColor_ = getColor(this.nextId_);
  this.generateRandom_();

  // Remonte un peu l'objet si commence par du vide.
  for (var l = 0; l < 4; l++) {
    var empty = true;
    for (var c = 0; c < 4; c++) {
      empty = empty && !this.current_[l][c];
    }
    if (empty && this.curY_ > 0) {
      this.curY_--;
    } else {
      break;
    }
  }

  this.updatePiece_();
};


/**
 * Sends to the tetrinet server the current field.
 * @private
 */
tetriweb.Tetris.prototype.sendField_ = function() {
  // First call to this function.
  if (this.oldGameArea_ == null) {
    this.oldGameArea_ = new Array(tetriweb.Tetris.HEIGHT_);
    for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
      this.oldGameArea_[l] = new Array(tetriweb.Tetris.WIDTH_);
      for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
        this.oldGameArea_[l][c] = 0;
      }
    }
  }

  // Sends the current field.
  this.tetrinet_.sendField(this.gameArea_, this.oldGameArea_);

  // Backup of the current field.
  this.oldGameArea_ = new Array(tetriweb.Tetris.HEIGHT_);
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    this.oldGameArea_[l] = new Array(tetriweb.Tetris.WIDTH_);
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.oldGameArea_[l][c] = this.gameArea_[l][c];
    }
  }
};


/**
 * Updates graphically the field using the internal matrix representing the
 * game.
 * @private
 */
tetriweb.Tetris.prototype.updateGrid_ = function() {
  var convert = tetriweb.Tetris.convert;

  // Removes all the elements in the container.
  var fieldContent = goog.array.clone(this.myField_.childNodes);
  goog.array.forEach(fieldContent, function(n) {
    if (n != this.currentObj_) {
      goog.dom.removeNode(n);
    }
  }, this);

  // Rebuild the field.
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      if (this.gameArea_[l][c] > 0) {
        var bloc = goog.dom.createDom('div');
        bloc.style.top = l * tetriweb.Tetris.BLOCK_SIZE_ + 1;
        bloc.style.left = c * tetriweb.Tetris.BLOCK_SIZE_ + 1;
        bloc.className = 'block ' + convert(this.gameArea_[l][c]);
        this.myField_.appendChild(bloc);
      }
    }
  }

};


/**
 * Update the graphical field and send it to the tetrinet server.
 * @private
 */
tetriweb.Tetris.prototype.updateGridAndSendField_ = function() {
  this.updateGrid_();
  this.sendField_();
};


/**
 * Updates the current piece by creating it and adding it to the field.
 * @private
 */
tetriweb.Tetris.prototype.updatePiece_ = function() {
  var convert = tetriweb.Tetris.convert;

  this.currentObj_ = goog.dom.createDom('div', {className: 'piece'});
  this.currentObj_.style.top = this.curY_ * tetriweb.Tetris.BLOCK_SIZE_;
  this.currentObj_.style.left = this.curX_ * tetriweb.Tetris.BLOCK_SIZE_;
  goog.dom.appendChild(this.myField_, this.currentObj_);
  for (var l = 0; l < 4; l++) {
    for (var c = 0; c < 4; c++) {
      if (this.current_[l][c]) {
        var bloc = goog.dom.createDom('div');
        bloc.style.top = l * tetriweb.Tetris.BLOCK_SIZE_ + 1;
        bloc.style.left = c * tetriweb.Tetris.BLOCK_SIZE_ + 1;
        bloc.className = 'block ' + convert(this.currentColor_);
        goog.dom.appendChild(this.currentObj_, bloc);
      }
    }
  }
};


tetriweb.Tetris.prototype.updateNextPiece = function(nextPiece) {
  var convert = tetriweb.Tetris.convert;
  var getColor = tetriweb.Tetris.getColor;

  var nextPieceObj = goog.dom.getElement('nextpiece');
  goog.dom.removeChildren(nextPieceObj);
  for (var l = 0; l < 4; l++) {
    for (var c = 0; c < 4; c++) {
      if (nextPiece[l][c]) {
        var block = goog.dom.createDom('div');
        block.style.top = l * tetriweb.Tetris.BLOCK_SIZE_ + 1;
        block.style.left = c * tetriweb.Tetris.BLOCK_SIZE_ + 1;
        block.className = 'block ' + convert(getColor(this.nextId_));
        goog.dom.appendChild(nextPieceObj, block);
      }
    }
  }
};


tetriweb.Tetris.prototype.emptyField_ = function() {
  this.myField_ = goog.dom.getElement('myfield');
  goog.dom.removeChildren(this.myField_);
};


tetriweb.Tetris.prototype.moveCurPieceH_= function(posX) {
  // Actualise la position de la piece.
  this.currentObj_.style.left = posX * tetriweb.Tetris.BLOCK_SIZE_;
}


tetriweb.Tetris.prototype.moveCurPieceV_ = function(posY) {
  // Actualise la position de la piece.
  this.currentObj_.style.top = posY * tetriweb.Tetris.BLOCK_SIZE_;
}


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.WIDTH_ = 12;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.HEIGHT_ = 22;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.BLOCK_SIZE_ = 20;


/**
 * @type {Array.<Array.<number>>}
 * @private
 */
tetriweb.Tetris.prototype.gameArea_ = null;


/**
 * @type {Array.<Array.<number>>}
 * @private
 */
tetriweb.Tetris.prototype.oldGameArea_ = null;


/**
 * @type {tetriweb.Tetrinet}
 * @private
 */
tetriweb.Tetris.prototype.tetrinet_ = null;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.curX_ = 6;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.curY_ = 0;


/**
 * TODO
 * @private
 */
tetriweb.Tetris.prototype.current_ = null;


/**
 * TODO
 * @private
 */
tetriweb.Tetris.prototype.currentColor_ = null;


/**
 * @type {object}
 * @private
 */
tetriweb.Tetris.prototype.currentObj_ = null;


/**
 * @type {object}
 * @private
 */
tetriweb.Tetris.prototype.myField_ = null;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.nextId_ = null;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.nextDirection_ = null;


/**
 * @type {boolean}
 * @private
 */
tetriweb.Tetris.prototype.gameLost_ = false;


/**
 * @type {number}
 */
tetriweb.Tetris.prototype.stepTimer = null;


/**
 * @type {boolean}
 * @private
 */
tetriweb.Tetris.prototype.pieceDropped_ = true;


/**
 * @type {Array.<number>}
 * @private
 */
tetriweb.Tetris.prototype.piecesFreq_ = null;


/**
 * @type {Array.<number>}
 * @private
 */
tetriweb.Tetris.prototype.specialsFreq_ = null;


/**
 * @type {Array.<number>}
 * @private
 */
tetriweb.Tetris.prototype.specialsQueue_ = null;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.specialLines_ = null;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.specialCount_ = null;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.specialCapacity_ = null;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.currentSpecialLines_ = null;
