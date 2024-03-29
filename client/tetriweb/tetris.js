goog.provide('tetriweb.Tetris');

goog.require('goog.array');
goog.require('goog.async.Delay');
goog.require('tetriweb.Graphics');


/**
 * Tetris Class.
 * @param {tetriweb.Tetrinet} tetrinet The tetrinet objet used to communicate
 *    with the tetrinet server.
 * @constructor
 */
tetriweb.Tetris = function(tetrinet) {
  this.tetrinet_ = tetrinet;
  this.tetrinet_.tetris = this;
  this.gameArea_ = new Array(tetriweb.Tetris.HEIGHT_);
};


/**
 * Initializes the game.
 * @param {number} _startingHeight The number of garbage lines at the bottom.
 * @param {number} _startingLevel The initial level.
 * @param {number} _linesLevel The number of lines required to advance to the
 *    next level.
 * @param {number} _levelIncrement The number of levels to increment when
 *    completing the linesLevel number or lines.
 * @param {number} _specialLines The number of lines required to get a special.
 * @param {number} _specialCount The number of specials added each time
 *    _specialLines are completed.
 * @param {number} _specialCapacity The capacity of the specials queue.
 * @param {string} _piecesFreq Occurence frequencies of each block.
 * @param {string} _specialsFreq Occurence frequencies of each special.
 * @private
 */
tetriweb.Tetris.prototype.init_ = function(
    _startingHeight, _startingLevel, _linesLevel, _levelIncrement,
    _specialLines, _specialCount, _specialCapacity, _piecesFreq, 
    _specialsFreq) {
  // init the game area : all empty.
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    this.gameArea_[l] = new Array(tetriweb.Tetris.WIDTH_);
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.gameArea_[l][c] = tetriweb.Tetris.BLOCK_EMPTY;
    }
  }
  tetriweb.Graphics.emptyField();

  // TODO: Starting height.

  this.gameLost_ = false;
  // Pieces' frequency.
  this.piecesFreq_ = /** @type {Array.<number>} */
      (goog.array.repeat(0, tetriweb.Tetris.NB_PIECES));
  for (var i = 0; i < _piecesFreq.length; i++) {
    this.piecesFreq_[parseInt(_piecesFreq[i], 10) - 1]++;
  }

  // Specials' frequency.
  this.specialsFreq_ = /** @type {Array.<number>} */
      (goog.array.repeat(0, tetriweb.Tetris.NB_SPECIAL_BLOCKS));
  for (var i = 0; i < _specialsFreq.length; i++) {
    this.specialsFreq_[parseInt(_specialsFreq[i], 10) - 1]++;
  }

  this.setLevel(_startingLevel);
  this.linesLevel_ = _linesLevel;
  this.levelIncrement_ = _levelIncrement;
  this.specialLines_ = _specialLines;
  this.specialCount_ = _specialCount;
  this.specialCapacity_ = _specialCapacity;
  this.currentSpecialLines_ = 0;
  this.currentLinesLevel_ = 0;
  this.specialsQueue_ = [];

  tetriweb.Graphics.updateSpecialBar(this.specialsQueue_);
  tetriweb.Graphics.clearEventLog();
};


/**
 * Starts a new game.
 * @param {number} _startingHeight The number of garbage lines at the bottom.
 * @param {number} _startingLevel The initial level.
 * @param {number} _linesLevel The number of lines required to advance to the
 *    next level.
 * @param {number} _levelIncrement The number of levels to increment when
 *    completing the linesLevel number or lines.
 * @param {number} _specialLines The number of lines required to get a special.
 * @param {number} _specialCount The number of specials added each time
 * _specialLines are completed.
 * @param {number} _specialCapacity The capacity of the specials queue.
 * @param {string} _piecesFreq Occurence frequencies of each block.
 * @param {string} _specialsFreq Occurence frequencies of each special.
 */
tetriweb.Tetris.prototype.startGame = function(_startingHeight, _startingLevel,
    _linesLevel, _levelIncrement, _specialLines, _specialCount, 
    _specialCapacity, _piecesFreq, _specialsFreq) {
  this.init_(_startingHeight, _startingLevel, _linesLevel, _levelIncrement,
      _specialLines, _specialCount, _specialCapacity, _piecesFreq,
      _specialsFreq);

  this.updateGridAndSendField_();
  this.generateRandom_();
  this.newPiece_();

  // Enable key events in game field
  this.keyEvents.setKeyEvent();
  this.pause_ = false;
};


/**
 * Stops the game.
 */
tetriweb.Tetris.prototype.stopGame = function() {
  // Stop the timer
  clearTimeout(this.stepTimer);
  // Disable key events in the field
  this.keyEvents.disposeKeyEvent();
};


/**
 * Return the pause state of the game. Used to disable the key events.
 * @return {boolean} True is the game is paused.
 */
tetriweb.Tetris.prototype.isPause = function() {
  return this.pause_;
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

  tetriweb.Graphics.updateNextPiece(nextPiece, this.nextId_);
};


/**
 * Checks for complete lines. Complete lines will be removed and create new
 * bonus or add lines to opponents.
 * @param {boolean=} opt_cleanupOnly If true, do not take specials nor send
 *    lines.
 * @private
 */
tetriweb.Tetris.prototype.checkLine_ = function(opt_cleanupOnly) {
  var cleanupOnly = opt_cleanupOnly ? opt_cleanupOnly : false;
  var nbLines = 0;
  var tmpSpecials = [];
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    var tetris = true;
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      tetris = tetris && (this.gameArea_[l][c] > tetriweb.Tetris.BLOCK_EMPTY);
    }
    if (tetris) {
      nbLines++;
      // Take specials
      for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
        if (this.gameArea_[l][c] >= tetriweb.Tetris.NB_NORMAL_BLOCKS) {
          tmpSpecials.push(this.gameArea_[l][c]);
        }
      }
      for (var ll = l; ll > 0; ll--) {
        for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
          this.gameArea_[ll][c] = this.gameArea_[ll - 1][c];
        }
      }
      for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
        this.gameArea_[0][c] = tetriweb.Tetris.BLOCK_EMPTY;
      }
    }
  }

  if (nbLines > 0) {
    this.updateGridAndSendField_();

    if (!cleanupOnly) {
      if (nbLines == 4) {
        this.tetrinet_.sendLines(nbLines);
      } else if (nbLines > 1) {
        this.tetrinet_.sendLines(nbLines - 1);
      }

      this.handleSpecials_(nbLines, tmpSpecials);
      this.handleLevel_(nbLines);
    }
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
      // Random position
      var posMax = this.specialsQueue_.length;
      var pos = tetriweb.Tetris.randomInt(0, posMax);
      // Move specials above new position
      for (var p = posMax; p > pos; p--) {
        this.specialsQueue_[p] = this.specialsQueue_[p - 1];
      }
      // Place new special
      this.specialsQueue_[pos] = specials[i];
    }
  }
  tetriweb.Graphics.updateSpecialBar(this.specialsQueue_);

  // Increment counters and place special blocks on the field
  this.currentSpecialLines_ += nbLines;
  var nbSpecials = this.currentSpecialLines_ / this.specialLines_;
  this.placeSpecials_(nbSpecials * this.specialCount_);
  this.currentSpecialLines_ %= this.specialLines_;
};


/**
 * Handles specials after complete lines cleanup.
 * @param {number} nbLines The number of complete lines.
 * @private
 */
tetriweb.Tetris.prototype.handleLevel_ = function(nbLines) {
  this.currentLinesLevel_ += nbLines;
  this.level_ += Math.floor(this.currentLinesLevel_ / this.linesLevel_);
  this.currentLinesLevel_ %= this.linesLevel_;
  tetriweb.Graphics.setLevel(this.level_);
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
      if (this.gameArea_[l][c] > tetriweb.Tetris.BLOCK_EMPTY &&
          this.gameArea_[l][c] < tetriweb.Tetris.NB_NORMAL_BLOCKS) {
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
    special += tetriweb.Tetris.NB_NORMAL_BLOCKS;

    // Choose place on the field (nth available block)
    var place = randomInt(0, availBlocks - i - 1);
    for (var l = 0; place >= 0 && l < tetriweb.Tetris.HEIGHT_; l++) {
      for (var c = 0; place >= 0 && c < tetriweb.Tetris.WIDTH_; c++) {
        if (this.gameArea_[l][c] > 0 && this.gameArea_[l][c] <
            tetriweb.Tetris.NB_NORMAL_BLOCKS) {
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


/**
 * Checks if the current piece collides with the ground
 * or the borders of the field
 * @param {number} pieceX The x-coordinate of the piece
 * @param {number} pieceY The y-coordinate of the piece
 * @return {boolean} True if the current piece collides.
 */
tetriweb.Tetris.prototype.checkCurrentPieceCollision_ = function(pieceX, pieceY) {
  var stop = false;
  for (var l = 0; l < tetriweb.Tetris.DIM_PIECE_ && !stop; l++) {
    for (var c = 0; c < tetriweb.Tetris.DIM_PIECE_ && !stop; c++) {
      if (this.current_[l][c]) {
        if (l + pieceY >= tetriweb.Tetris.HEIGHT_ ||
            this.gameArea_[l + pieceY][c + pieceX] >
            tetriweb.Tetris.BLOCK_EMPTY) {
          stop = true;
        }
      }
    }
  }
  return stop;
};


/**
 * Game Engine. This function is called periodicaly.
 * @private
 */
tetriweb.Tetris.prototype.step_ = function() {
  clearTimeout(this.stepTimer);

  // Piece touch the ground?
  var stop = this.checkCurrentPieceCollision_(this.curX_, this.curY_ + 1);
  // If the piece touch the ground.
  if (stop) {
    for (var l = 0; l < tetriweb.Tetris.DIM_PIECE_; l++) {
      for (var c = 0; c < tetriweb.Tetris.DIM_PIECE_; c++) {
        if (this.current_[l][c]) {
          this.gameArea_[l + this.curY_][c + this.curX_] = this.currentColor_;
        }
      }
    }
    tetriweb.Graphics.layDownPiece(
        this.curX_, this.curY_, this.current_, this.currentColor_);

    this.pieceDropped_ = true;
    this.checkLine_();
    this.sendField_();

    var delay = new goog.async.Delay(this.newPiece_, tetriweb.Tetris.PIECE_DELAY_, this);
    delay.start();
  } else {
    this.curY_++;
    tetriweb.Graphics.moveCurPieceV(this.curY_);
    this.setTimer();
  }
};


/**
 * Sets the timer.
 */
tetriweb.Tetris.prototype.setTimer = function() {
  this.stepTimer = window.setTimeout(
      goog.bind(this.step_, this), 1005 - (this.level_ * 10));
};


/**
 * Pauses the game.
 */
tetriweb.Tetris.prototype.pauseGame = function() {
  tetriweb.Graphics.displayPause();
  this.pause_ = true;
  clearTimeout(this.stepTimer);
  this.heartbeatTimer = window.setInterval(
      goog.bind(this.tetrinet_.heartbeat, this.tetrinet_), 10000);
};


/**
 * Resume the game.
 */
tetriweb.Tetris.prototype.resumeGame = function() {
  tetriweb.Graphics.hidePause();
  this.pause_ = false;
  clearTimeout(this.stepTimer);
  clearTimeout(this.heartbeatTimer);
  this.setTimer();
};


/**
 * Rotates the current piece if possible, when UP key is pressed.
 */
tetriweb.Tetris.prototype.tryToRotate = function() {
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
    for (var l = 0; l < tetriweb.Tetris.DIM_PIECE_ && ok; l++) {
      for (var c = 0; c < tetriweb.Tetris.DIM_PIECE_ && ok; c++) {
        if (piece[l][c]) {
          var newL = this.curY_ + l;
          var newC = this.curX_ + delta_x[dx] + c;
          ok = newC >= 0 &&
               newC < tetriweb.Tetris.WIDTH_ &&
               newL >= 0 &&
               newL < tetriweb.Tetris.HEIGHT_ &&
               this.gameArea_[newL][newC] == tetriweb.Tetris.BLOCK_EMPTY;
        }
      }
    }
  }
  dx--;

  if (ok) {
    this.curX_ += delta_x[dx];
    this.current_ = piece;
    tetriweb.Graphics.updatePiece(
        this.current_, this.curX_, this.curY_, this.currentColor_);
  }
};


/**
 * Moves the current piece left or right if possible,
 * when LEFT or RIGHT key is pressed.
 * @param {number} shift 1 (right) or -1 (left).
 */
tetriweb.Tetris.prototype.moveLeftOrRight = function(shift) {
  var ok = true;
  for (var l = 0; l < tetriweb.Tetris.DIM_PIECE_ && ok; l++) {
    for (var c = 0; c < tetriweb.Tetris.DIM_PIECE_ && ok; c++) {
      ok = !this.current_[l][c] ||
          (c + this.curX_ + shift >= 0 &&
          c + this.curX_ + shift < tetriweb.Tetris.WIDTH_ &&
          !this.gameArea_[l + this.curY_][c + this.curX_ + shift]);
    }
  }
  if (ok) {
    this.curX_ += shift;
  }
  tetriweb.Graphics.moveCurPieceH(this.curX_);
};


/**
 * Moves the current piece down, when DOWN key is pressed.
 */
tetriweb.Tetris.prototype.moveDown = function() {
  this.step_();
};


/**
 * Drops the current piece when SPACE key is pressed.
 */
tetriweb.Tetris.prototype.drop = function() {
  this.pieceDropped_ = false;
  while (!this.pieceDropped_) {
    this.step_();
  }
};


/**
 * Uses the first special of the queue on the given player,
 * when a numeric key (1 to 6) is pressed.
 * @param {number} playerNum The target player.
 */
tetriweb.Tetris.prototype.useSpecial = function(playerNum) {
  if (this.specialsQueue_.length == 0) {
    return;
  }

  var convert = tetriweb.Tetris.convert;
  var specialName = convert(this.specialsQueue_.shift()).substring(3);
  if (this.tetrinet_.playerExists(playerNum)) {
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
  }
  tetriweb.Graphics.updateSpecialBar(this.specialsQueue_);
};


/**
 * Deletes the first special of the queue, when D key is pressed.
 */
tetriweb.Tetris.prototype.deleteSpecial = function() {
  if (this.specialsQueue_.length == 0) {
    return;
  }

  this.specialsQueue_.shift();
  tetriweb.Graphics.updateSpecialBar(this.specialsQueue_);
};


/**
 * Genere une piece.
 * @param {number} id Identifiant de la piece.
 * @param {number} orientation Nombre de rotation de 90 degres sens horaire.
 * @return {Array.<Array.<boolean>>} La matrice qui represente la piece.
 */
tetriweb.Tetris.generatePiece = function(id, orientation) {
  var piece = new Array(tetriweb.Tetris.DIM_PIECE_);

  switch (id) {
    case 0:
      piece[0] = new Array(true, true, true, true);
      piece[1] = new Array(false, false, false, false);
      piece[2] = new Array(false, false, false, false);
      piece[3] = new Array(false, false, false, false);
      break;
    case 1:
      piece[0] = new Array(true, true, false, false);
      piece[1] = new Array(true, true, false, false);
      piece[2] = new Array(false, false, false, false);
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
      piece[0] = new Array(true, true, false, false);
      piece[1] = new Array(false, true, true, false);
      piece[2] = new Array(false, false, false, false);
      piece[3] = new Array(false, false, false, false);
      break;
    case 5:
      piece[0] = new Array(false, true, true, false);
      piece[1] = new Array(true, true, false, false);
      piece[2] = new Array(false, false, false, false);
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
  var npiece = new Array(tetriweb.Tetris.DIM_PIECE_);
  for (var l = 0; l < tetriweb.Tetris.DIM_PIECE_; l++) {
    npiece[l] = new Array(tetriweb.Tetris.DIM_PIECE_);
    for (var c = 0; c < tetriweb.Tetris.DIM_PIECE_; c++) {
      npiece[l][c] = piece[3 - c][l];
    }
  }

  // Deplacement de la piece en haut a gauche.
  var done_t = false, done_l = false;
  do {
    done_t = npiece[0][0] || npiece[0][1] || npiece[0][2] || npiece[0][3];
    if (!done_t) {
      for (var l = 0; l < tetriweb.Tetris.DIM_PIECE_ - 1; l++) {
        for (var c = 0; c < tetriweb.Tetris.DIM_PIECE_; c++) {
          npiece[l][c] = npiece[l + 1][c];
        }
      }
      for (var c = 0; c < tetriweb.Tetris.DIM_PIECE_; c++) {
        npiece[tetriweb.Tetris.DIM_PIECE_ - 1][c] = false;
      }
    }
    done_l = npiece[0][0] || npiece[1][0] || npiece[2][0] || npiece[3][0];
    if (!done_l) {
      for (var l = 0; l < tetriweb.Tetris.DIM_PIECE_; l++) {
        for (var c = 0; c < tetriweb.Tetris.DIM_PIECE_ - 1; c++) {
          npiece[l][c] = npiece[l][c + 1];
        }
      }
      for (var l = 0; l < tetriweb.Tetris.DIM_PIECE_; l++) {
        npiece[l][tetriweb.Tetris.DIM_PIECE_ - 1] = false;
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
    case tetriweb.Tetris.BLOCK_EMPTY:
            return 'empty';
    case tetriweb.Tetris.BLOCK_BLUE:
            return 'blue';
    case tetriweb.Tetris.BLOCK_YELLOW:
            return 'yellow';
    case tetriweb.Tetris.BLOCK_GREEN:
            return 'green';
    case tetriweb.Tetris.BLOCK_PURPLE:
            return 'purple';
    case tetriweb.Tetris.BLOCK_RED:
            return 'red';
    case tetriweb.Tetris.BLOCK_SB_A:
            return 'sb-a';
    case tetriweb.Tetris.BLOCK_SB_C:
            return 'sb-c';
    case tetriweb.Tetris.BLOCK_SB_N:
            return 'sb-n';
    case tetriweb.Tetris.BLOCK_SB_R:
            return 'sb-r';
    case tetriweb.Tetris.BLOCK_SB_S:
            return 'sb-s';
    case tetriweb.Tetris.BLOCK_SB_B:
            return 'sb-b';
    case tetriweb.Tetris.BLOCK_SB_G:
            return 'sb-g';
    case tetriweb.Tetris.BLOCK_SB_Q:
            return 'sb-q';
    case tetriweb.Tetris.BLOCK_SB_O:
            return 'sb-o';
    default:
            alert('unknown block ' + typeof(color) + ' ' + color);
            return '';
  }
};


/**
 * Retourne le code couleur pour un identifiant de piece donné.
 * @param {number} id Identifiant de la piece.
 * @return {number} Code couleur.
 */
tetriweb.Tetris.getColor = function(id) {
  switch (id) {
    case 0: return tetriweb.Tetris.BLOCK_BLUE;    // barre : bleu
    case 1: return tetriweb.Tetris.BLOCK_YELLOW;  // carré : jaune
    case 2: return tetriweb.Tetris.BLOCK_GREEN;   // L gauche : vert
    case 3: return tetriweb.Tetris.BLOCK_PURPLE;  // L droite : violet
    case 4: return tetriweb.Tetris.BLOCK_RED;     // Z : rouge
    case 5: return tetriweb.Tetris.BLOCK_BLUE;    // Z inversé : bleu
    case 6: return tetriweb.Tetris.BLOCK_YELLOW;  // T : jaune
    default: return id;
  }
};




//
// Actions
//


/**
 * Adds a line at the bottom of the grid.
 */
tetriweb.Tetris.prototype.addLine = function() {
  for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
    if (this.gameArea_[0][c] > tetriweb.Tetris.BLOCK_EMPTY) {
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
      this.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][c] =
          randomInt(1, tetriweb.Tetris.NB_NORMAL_BLOCKS - 1);
    }
    var r = randomInt(0, tetriweb.Tetris.WIDTH_ - 1);
    this.gameArea_[tetriweb.Tetris.HEIGHT_ - 1][r] =
        tetriweb.Tetris.BLOCK_EMPTY;

    // On décale la pièce courante si besoin
    if (this.curY_ > 0) {
      var stop = false;
      for (var l = 0; l < tetriweb.Tetris.DIM_PIECE_ && !stop; l++) {
        for (var c = 0; c < tetriweb.Tetris.DIM_PIECE_ && !stop; c++) {
          if (this.current_[l][c] &&
              this.gameArea_[l + this.curY_][c + this.curX_] >
              tetriweb.Tetris.BLOCK_EMPTY) {
            stop = true;
            this.curY_--;
            tetriweb.Graphics.moveCurPieceV(this.curY_);
          }
        }
      }
    }
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
      if (this.gameArea_[l][c] > tetriweb.Tetris.BLOCK_EMPTY) {
        if (l != curLine) {
          this.gameArea_[curLine][c] = this.gameArea_[l][c];
          this.gameArea_[l][c] = tetriweb.Tetris.BLOCK_EMPTY;
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
    this.gameArea_[randomInt(0, 21)][randomInt(0, 11)] =
        tetriweb.Tetris.BLOCK_EMPTY;
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
          oldLine[(c - shift + tetriweb.Tetris.WIDTH_) %
              tetriweb.Tetris.WIDTH_];
    }
  }
  this.updateGridAndSendField_();
};


/**
 * Switch fields with another player.
 * @param {number} playerNum The player to switch fields with.
 */
tetriweb.Tetris.prototype.switchFields = function(playerNum) {
  var playerField = (playerNum == this.tetrinet_.getMyPlayerNum()) ?
      this.gameArea_ : this.tetrinet_.getPlayerField(playerNum);
  for (var l = 0; l < tetriweb.Tetris.HEIGHT_; l++) {
    for (var c = 0; c < tetriweb.Tetris.WIDTH_; c++) {
      this.gameArea_[l][c] = (l < 6) ?
          tetriweb.Tetris.BLOCK_EMPTY : playerField[l][c];
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
      if (this.gameArea_[l][c] >= tetriweb.Tetris.NB_NORMAL_BLOCKS) {
        this.gameArea_[l][c] =
            randomInt(1, tetriweb.Tetris.NB_NORMAL_BLOCKS - 1);
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
      if (this.gameArea_[l][c] == tetriweb.Tetris.BLOCK_SB_O) {
        // Remove bomb
        this.gameArea_[l][c] = tetriweb.Tetris.BLOCK_EMPTY;
        // Explode the blocks around
        for (var d = 0; d < dep.length; d++) {
          var ll = l + dep[d][0];
          var cc = c + dep[d][1];
          if (ll >= 0 && ll < tetriweb.Tetris.HEIGHT_ &&
              cc >= 0 && cc < tetriweb.Tetris.WIDTH_) {
            if (this.gameArea_[ll][cc] != tetriweb.Tetris.BLOCK_SB_O) {
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
      this.gameArea_[l][c] = tetriweb.Tetris.BLOCK_EMPTY;
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
      this.gameArea_[l][c] = randomInt(1, tetriweb.Tetris.NB_NORMAL_BLOCKS - 1);
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

  // TODO: On devrait recopier nextPiece je pense au lieu de regenerer
  // (comme ca on n'a plus besoin de nextId et nextDirection). Et peut etre
  // faire une structure qui contient la piece et sa couleur.
  this.current_ = tetriweb.Tetris.generatePiece(
      this.nextId_, this.nextDirection_);
  this.currentColor_ = getColor(this.nextId_);
  this.generateRandom_();

  clearTimeout(this.stepTimer);
  
  if (this.checkCurrentPieceCollision_(this.curX_, this.curY_)) {
    this.gameLost_ = true;
    this.tetrinet_.sendPlayerlost();
    this.fillRandomly_();
  } else {
    tetriweb.Graphics.updatePiece(
        this.current_, this.curX_, this.curY_, this.currentColor_);
    this.setTimer();
  }
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
        this.oldGameArea_[l][c] = tetriweb.Tetris.BLOCK_EMPTY;
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
 * Updates the graphical field and send it to the tetrinet server.
 * @private
 */
tetriweb.Tetris.prototype.updateGridAndSendField_ = function() {
  tetriweb.Graphics.updateGrid(this.gameArea_);
  this.sendField_();
};


/**
 * Gets the game state (lost or not).
 * @return {boolean} True if the game is lost.
 */
tetriweb.Tetris.prototype.isGameLost = function() {
  return this.gameLost_;
};


/**
 * Sets the current level.
 * @param {number} level The current level.
 */
tetriweb.Tetris.prototype.setLevel = function(level) {
  if (level <= 100) {
    this.level_ = level;
  }
  tetriweb.Graphics.setLevel(level);
};


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
tetriweb.Tetris.DIM_PIECE_ = 4;


/**
 * @type {number}
 */
tetriweb.Tetris.NB_PIECES = 7;


/**
 * @type {number}
 */
tetriweb.Tetris.NB_BLOCKS = 15;


/**
 * @type {number}
 */
tetriweb.Tetris.NB_NORMAL_BLOCKS = 6;


/**
 * @type {number}
 */
tetriweb.Tetris.NB_SPECIAL_BLOCKS = 9;


/**
 * @type {number}
 */
tetriweb.Tetris.BLOCK_EMPTY = 0;
tetriweb.Tetris.BLOCK_BLUE = 1;
tetriweb.Tetris.BLOCK_YELLOW = 2;
tetriweb.Tetris.BLOCK_GREEN = 3;
tetriweb.Tetris.BLOCK_PURPLE = 4;
tetriweb.Tetris.BLOCK_RED = 5;
tetriweb.Tetris.BLOCK_SB_A = 6;
tetriweb.Tetris.BLOCK_SB_C = 7;
tetriweb.Tetris.BLOCK_SB_N = 8;
tetriweb.Tetris.BLOCK_SB_R = 9;
tetriweb.Tetris.BLOCK_SB_S = 10;
tetriweb.Tetris.BLOCK_SB_B = 11;
tetriweb.Tetris.BLOCK_SB_G = 12;
tetriweb.Tetris.BLOCK_SB_Q = 13;
tetriweb.Tetris.BLOCK_SB_O = 14;


/**
 * @type {Object.<string, string>}
 */
tetriweb.Tetris.SPECIALS = {'cs1': '1 line', 'cs2': '2 lines',
  'cs4' : '4 lines', 'a': 'Add line', 'c': 'Clear line', 'n': 'Nuke field',
  'r': 'Random clear blocks', 's': 'Switch fields',
  'b': 'Clear special blocks', 'g': 'Block gravity',
  'q': 'Block quake', 'o': 'Block bomb'};


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.level_ = 1;


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
 * @type {tetriweb.KeyEvents}
 */
tetriweb.Tetris.prototype.keyEvents = null;


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
 * @type {Array.<Array.<number>>}
 * @private
 */
tetriweb.Tetris.prototype.current_ = null;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.currentColor_;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.nextId_;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.nextDirection_;


/**
 * @type {boolean}
 * @private
 */
tetriweb.Tetris.prototype.pause_ = false;


/**
 * @type {boolean}
 * @private
 */
tetriweb.Tetris.prototype.gameLost_ = false;


/**
 * @type {number}
 */
tetriweb.Tetris.prototype.stepTimer;


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
tetriweb.Tetris.prototype.specialLines_;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.specialCount_;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.specialCapacity_;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.prototype.currentSpecialLines_;


/**
 * @type {number}
 * @private
 */
tetriweb.Tetris.PIECE_DELAY_ = 1000;
