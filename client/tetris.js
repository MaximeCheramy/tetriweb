goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.KeyHandler');

goog.provide('tetriweb.Tetris');

/**
 * Tetris.
 * @param {object} tetrinet L'objet tetrinet.
 * @constructor
 */
tetriweb.Tetris = function(tetrinet) {
  // TODO: Les variables locales devraient etre def en dehors du constructeur
  // sous la forme: tetriweb.Tetris.variable_.
  var current = null;
  var currentObj = null;
  var currentColor = null;
  var montimer = null;
  var pieceDropped = true;
  var next_id = null;
  var next_o = null;
  var piecesFreq = null;
  var specialsFreq = null;
  var specialLines = null;
  var specialCount = null;
  var specialCapacity = null;
  var currentSpecialLines = null;
  var specialsQueue = null;

  this.tetrinet_ = tetrinet;
  this.tetrinet_.tetris = this;
  this.gameArea_ = new Array(22);

  // TODO: Deplacer les fonctions vers tetriweb.Tetris.fonction et en dehors du
  // constructeur.
  this.init = function(
      _specialLines, _specialCount, _specialCapacity, _piecesFreq, _specialsFreq) {
    // init the game area : all empty.
    for (var l = 0; l < 22; l++) {
      this.gameArea_[l] = new Array(12);
      for (var c = 0; c < 12; c++) {
        this.gameArea_[l][c] = 0;
      }
    }

    this.gameLost_ = false;
    // fréquence des pièces
    piecesFreq = goog.array.repeat(0, 7);
    for (var i = 0; i < _piecesFreq.length; i++) {
      piecesFreq[parseInt(_piecesFreq[i]) - 1]++;
    }
    var n = 0;
    for (var i = 0; i < 7; i++) {
      n += piecesFreq[i];
      piecesFreq[i] = n;
    }
    //console.log(piecesFreq);

    // fréquence des specials
    specialsFreq = goog.array.repeat(0, 9);
    for (var i = 0; i < _specialsFreq.length; i++) {
      specialsFreq[parseInt(_specialsFreq[i]) - 1]++;
    }
    n = 0;
    for (var i = 0; i < 9; i++) {
      n += specialsFreq[i];
      specialsFreq[i] = n;
    }
    //console.log(specialsFreq);

    specialLines = _specialLines;
    specialCount = _specialCount;
    specialCapacity = _specialCapacity;
    currentSpecialLines = 0;
    specialsQueue = [];

    this.myField_ = goog.dom.getElement('myfield');

    this.updateGrid();
    this.generateRandom();
    this.newPiece();
    montimer = window.setTimeout(goog.bind(this.step, this), 1000);

    goog.events.removeAll(this.myField_);
    var keyHandler = new goog.events.KeyHandler(this.myField_);
    goog.events.listen(keyHandler, goog.events.KeyHandler.EventType.KEY,
        goog.bind(this.keyHandler, this));
  };

  this.generateRandom = function() {
    var randomInt = tetriweb.Tetris.randomInt;
    var n = randomInt(0, 99);
    next_id = 0; // prochaine pièce
    while (n >= piecesFreq[next_id]) {
      next_id++;
    }
    next_o = randomInt(0, 3); // orientation de la pièce

    var nextpiece = tetriweb.Tetris.generatePiece(next_id, next_o);
    var nextpieceobj = goog.dom.getElement('nextpiece');
    goog.dom.removeChildren(nextpieceobj);
    for (var l = 0; l < 4; l++) {
      for (var c = 0; c < 4; c++) {
        if (nextpiece[l][c]) {
          var bloc = goog.dom.createDom('div');
          bloc.style.top = l * 20 + 1;
          bloc.style.left = c * 20 + 1;
          bloc.className = 'block ' + this.convert(this.getColor(next_id));
          goog.dom.appendChild(nextpieceobj, bloc);
        }
      }
    }
  };


  this.newPiece = function() {
    // temp.
    this.curX_ = 5;
    this.curY_ = 0;

    current = tetriweb.Tetris.generatePiece(next_id, next_o);
    currentColor = this.getColor(next_id);
    this.generateRandom();

    // Remonte un peu l'objet si commence par du vide.
    for (var l = 0; l < 4; l++) {
      var vide = true;
      for (var c = 0; c < 4; c++) {
        vide = vide && !current[l][c];
      }
      if (vide) {
        this.curY_--;
      } else {
        break;
      }
    }

    this.updatePiece();
  };

  this.nukeField = function() {
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        this.gameArea_[l][c] = 0;
      }
    }
    this.updateGrid();
  };

  this.updatePiece = function() {
    currentObj = goog.dom.createDom('div', {class: 'piece'});
    currentObj.style.top = this.curY_ * 20;
    currentObj.style.left = this.curX_ * 20;
    goog.dom.appendChild(this.myField_, currentObj);
    for (var l = 0; l < 4; l++) {
      for (var c = 0; c < 4; c++) {
        if (current[l][c]) {
          var bloc = goog.dom.createDom('div');
          bloc.style.top = l * 20 + 1;
          bloc.style.left = c * 20 + 1;
          bloc.className = 'block ' + this.convert(currentColor);
          goog.dom.appendChild(currentObj, bloc);
        }
      }
    }
  };

  this.convert = function(color) {
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

  this.getColor = function(id) {
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


  /**
   * Met a jour graphiquement la grille a partir de la representation interne
   * du jeu.
   */
  this.updateGrid = function() {
    var fieldContent = goog.array.clone(this.myField_.childNodes);
    goog.array.forEach(fieldContent, function(n) {
      if (n != currentObj) {
        goog.dom.removeNode(n);
      }
    }, this);

    // On reconstruit
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        if (this.gameArea_[l][c] > 0) {
          var bloc = goog.dom.createDom('div');
          bloc.style.top = l * 20 + 1;
          bloc.style.left = c * 20 + 1;
          bloc.className = 'block ' + this.convert(this.gameArea_[l][c]);
          this.myField_.appendChild(bloc);
        }
      }
    }

    this.sendField_();
  };


  /**
   * Rempli la grille de cases aléatoires. Utilisé lors d'une partie perdue.
   */
  this.fillRandomly = function() {
    var randomInt = tetriweb.Tetris.randomInt;
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        this.gameArea_[l][c] = randomInt(1, 5);
      }
    }
    this.updateGrid();
  };

  /**
   * Vérifie s'il y a des lignes completes pour les supprimer et créer des
   * bonus ou envoyer des lignes a l'adversaire.
   */
  this.checkLine = function() {
    var nbLines = 0;
    var tmpSpecials = [];
    for (var l = 0; l < 22; l++) {
      var tetris = true;
      for (var c = 0; c < 12; c++) {
        tetris = tetris && (this.gameArea_[l][c] > 0);
      }
      if (tetris) {
        nbLines++;
        // Take specials
        for (var c = 0; c < 12; c++) {
          if (this.gameArea_[l][c] > 5) {
            tmpSpecials.push(this.gameArea_[l][c]);
          }
        }
        for (var ll = l; ll > 0; ll--) {
          for (var c = 0; c < 12; c++) {
            this.gameArea_[ll][c] = this.gameArea_[ll - 1][c];
          }
        }
        for (var c = 0; c < 12; c++) {
          this.gameArea_[0][c] = 0;
        }
      }
    }
    this.updateGrid();
    if (nbLines == 4) {
      this.tetrinet_.sendLines(nbLines);
    } else if (nbLines > 1) {
      this.tetrinet_.sendLines(nbLines - 1);
    }

    //console.log(tmpSpecials);

    for (var i = 0; i < tmpSpecials.length &&
        specialsQueue.length < specialCapacity; i++) {
      for (var j = 0; j < nbLines &&
          specialsQueue.length < specialCapacity; j++) {
        specialsQueue.push(tmpSpecials[i]);
      }
    }
    this.updateSpecialBar();

    // Special handling
    currentSpecialLines += nbLines;
    this.placeSpecials((currentSpecialLines / specialLines) * specialCount);
    currentSpecialLines %= specialLines;
  };


  /**
   * TODO: Comment.
   */
  this.updateSpecialBar = function() {
    var specialBar = goog.dom.getElement('specialbar');
    goog.dom.removeChildren(specialBar);
    for (var i = 0; i < specialsQueue.length; i++) {
      var special = goog.dom.createDom('div');
      special.className = 'block ' + this.convert(specialsQueue[i]);
      special.style.top = 0;
      special.style.left = i * 20 + 1;
      goog.dom.appendChild(specialBar, special);
    }
  }


  /**
   * TODO: Comment.
   */
  this.placeSpecials = function(nb) {
    var randomInt = tetriweb.Tetris.randomInt;
    var availBlocks = 0;
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        if (this.gameArea_[l][c] > 0 && this.gameArea_[l][c] <= 5) {
          availBlocks++;
        }
      }
    }
    var blocksToPlace = Math.min(nb, availBlocks);

    //console.log('availBlocks : ' + availBlocks);
    //console.log('blocksToPlace : ' + blocksToPlace);

    for (var i = 0; i < blocksToPlace; i++) {
      var n = randomInt(0, 99);
      var special = 0;
      while (n >= specialsFreq[special]) {
        special++;
      }
      special += 6;
      var place = randomInt(0, availBlocks - i - 1);
      //console.log('place : ' + place);
      for (var l = 0; place >= 0 && l < 22; l++) {
        for (var c = 0; place >= 0 && c < 12; c++) {
          if (this.gameArea_[l][c] > 0 && this.gameArea_[l][c] <= 5) {
            if (place == 0) {
              this.gameArea_[l][c] = special;
            }
            place--;
          }
        }
      }
    }

    if (blocksToPlace > 0) {
      this.updateGrid();
    }
  };


  /**
   * Fonction appelée périodiquement pour faire avancer le jeu.
   */
  this.step = function() {
    //TODO: Commenter le workflow du moteur de jeu.

    var stop = false;
    for (var l = 0; l < 4 && !stop; l++) {
      for (var c = 0; c < 4 && !stop; c++) {
        if (current[l][c]) {
          if (l + this.curY_ + 1 >= 22 || this.gameArea_[l + this.curY_ + 1][c + this.curX_] > 0) {
            stop = true;
          }
        }
      }
    }
    if (!stop) {
      this.curY_++;
      currentObj.style.top = this.curY_ * 20;
    } else {
      if (this.curY_ <= 0) {
        this.gameLost_ = true;
      }

      // On dépose les pièces
      for (var l = 0; l < 4; l++) {
        for (var c = 0; c < 4; c++) {
          if (current[l][c]) {
            this.gameArea_[l + this.curY_][c + this.curX_] = currentColor;
            var bloc = goog.dom.createDom('div');
            bloc.style.top = (this.curY_ + l) * 20 + 1;
            bloc.style.left = (this.curX_ + c) * 20 + 1;
            bloc.className = 'block ' + this.convert(currentColor);
            goog.dom.appendChild(this.myField_, bloc);
          }
        }
      }
      goog.dom.removeNode(currentObj);
      pieceDropped = true;
      this.checkLine();
      this.sendField_();
      this.newPiece();
    }
    if (this.gameLost_) {
      this.tetrinet_.sendPlayerlost();
      this.fillRandomly();
    } else {
      clearTimeout(montimer);
      montimer = window.setTimeout(goog.bind(this.step, this), 1000);
    }
  };

  /**
   * Fonction appelée lors de l'appuie d'une touche sur le tetris.
   * @param {object} e L'event.
   */
  this.keyHandler = function(e) {
    //console.log(e.keyCode);
    // TODO: Séparer en plusieurs fonctions ? Oui/Non ?

    // Stop la propagation de l'event.
    e.preventDefault();

    // Si la partie est perdue alors on ne fait rien.
    if (this.gameLost_) return;

    // Touche haut ou 8.
    if (e.keyCode == 38 || e.keyCode == 56) {
      piece = tetriweb.Tetris.rotate_(current);

      // verifie si new ok.
      var ok = false;
      // TODO: visiblement 2 ne sert jamais, et 3 que pour les linebar.
      // Optimisable donc...
      var delta_x = [0, 1, -1, 2, -2, 3, -3];
      var dx = 0;
      for (dx = 0; dx < delta_x.length && !ok; dx++) {
        //console.log("trying dx = " + delta_x[dx]);
        ok = true;
        for (var l = 0; l < 4 && ok; l++) {
          for (var c = 0; c < 4 && ok; c++) {
            if (piece[l][c]) {
              ok = (this.curX_ + delta_x[dx] + c) >= 0 &&
                   (this.curX_ + delta_x[dx] + c) < 12 &&
                   (this.curY_ + l) >= 0 &&
                   (this.curY_ + l) < 22 &&
                   this.gameArea_[this.curY_ + l][this.curX_ + delta_x[dx] + c] == 0;
            }
          }
        }
      }
      dx--;
      //console.log("dx = " + dx + " delta_x = " + delta_x[dx]);

      if (ok) {
        this.curX_ += delta_x[dx];
        current = piece;
        goog.dom.removeNode(currentObj);
        this.updatePiece();
      }
    }

    // Touche droite.
    if (e.keyCode == 39 || e.keyCode == 54) {
      var ok = true;
      for (var l = 0; l < 4 && ok; l++) {
        for (var c = 0; c < 4 && ok; c++) {
          if (current[l][c]) {
            if (c + this.curX_ + 1 >= 12 ||
                this.gameArea_[l + this.curY_][c + this.curX_ + 1] > 0) {
              ok = false;
            }
          }
        }
      }
      if (ok) {
        this.curX_++;
      }
    }

    // Touche gauche.
    if (e.keyCode == 37 || e.keyCode == 52) {
      var ok = true;
      for (var l = 0; l < 4 && ok; l++) {
        for (var c = 0; c < 4 && ok; c++) {
          if (current[l][c]) {
            if (c + this.curX_ - 1 < 0 ||
                this.gameArea_[l + this.curY_][c + this.curX_ - 1] > 0) {
              ok = false;
            }
          }
        }
      }
      if (ok) {
        this.curX_--;
      }
    }

    // Touche bas.
    if (e.keyCode == 40 || e.keyCode == 50) {
      clearTimeout(montimer);
      this.step();
    }

    // Touche espace.
    if (e.charCode == 32) {
      pieceDropped = false;
      while (!pieceDropped) {
        this.step();
      }
    }

    // Envoi bonus (touches 1 à 6 haut du clavier)
    if (e.keyCode >= 49 && e.keyCode <= 54) {
      var playerNum = e.keyCode - 48;
      if (this.tetrinet_.playerExists(playerNum)) {
        var specialName = this.convert(specialsQueue.shift()).substring(3);
        this.tetrinet_.sendSpecial(specialName, playerNum);
        this.updateSpecialBar();
      }
    }

    // Delete bonus (d)
    if (e.keyCode == 68) {
      specialsQueue.shift();
      this.updateSpecialBar();
    }

    // Actualise la position de la piece.
    currentObj.style.left = this.curX_ * 20;
  };

};


/**
 * Genere une piece.
 * @param {number} id Identifiant de la piece.
 * @param {number} orientation Nombre de rotation de 90 degres sens horaire.
 * @return {array<array<boolean>>} La matrice qui represente la piece.
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
 * @param {Array.<Array<number>>} piece La piece que l'on veut faire pivoter.
 * @return {Array.<Array<number>>} La piece retournée.
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


//
// Actions
//


/**
 * Ajoute une ligne (incomplete) tout en bas de l'air de jeu.
 */
tetriweb.Tetris.prototype.addLine = function() {
  for (var c = 0; c < 12; c++) {
    if (this.gameArea_[0][c] > 0) {
      this.gameLost_ = true;
    }
  }
  if (!this.gameLost_) {
    var randomInt = tetriweb.Tetris.randomInt;
    // On decale tout vers le haut.
    for (var l = 1; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        this.gameArea_[l - 1][c] = this.gameArea_[l][c];
      }
    }

    for (var c = 0; c < 12; c++) {
      // TODO: Algo trop approximatif choisi pour sa simplicité. A recoder.
      this.gameArea_[21][c] = randomInt(0, 5);
    }
    this.updateGrid();
  }
};


/**
 * Supprime la ligne la plus en bas de l'air de jeu.
 */
tetriweb.Tetris.prototype.clearLine = function() {
  // On décale tout vers le bas.
  for (var l = 21; l > 0; l--) {
    for (var c = 0; c < 12; c++) {
      this.gameArea_[l][c] = this.gameArea_[l - 1][c];
    }
  }
  this.updateGrid();
};


/**
 * Fait tomber les blocs par gravité.
 */
tetriweb.Tetris.prototype.blockGravity = function() {
  for (var l = 20; l >= 0; l--) {
    var g = false;
    for (var c = 0; c < 12; c++) {
      if (this.gameArea_[l][c] > 0 && this.gameArea_[l + 1][c] == 0) {
        this.gameArea_[l + 1][c] = this.gameArea_[l][c];
        this.gameArea_[l][c] = 0;
        g = true;
      }
    }
    if (g) {
      l += 2;
      // Un peu crade je trouve, peut-etre remplacer le for sur les lignes
      // par un while ou alors inserer un while pour faire tomber les blocks.
      if (l > 20) {
        l = 21;
      }
    }
  }
  this.updateGrid();
};


/**
 * Fonction qui permet l'envoie au serveur tetrinet de la grille de jeu.
 */
tetriweb.Tetris.prototype.sendField_ = function() {
  // Si c'est le premier appel.
  if (this.oldGameArea_ == null) {
    this.oldGameArea_ = new Array(22);
    for (var l = 0; l < 22; l++) {
      this.oldGameArea_[l] = new Array(12);
      for (var c = 0; c < 12; c++) {
        this.oldGameArea_[l][c] = 0;
      }
    }
  }

  // On envoie la nouvelle grille.
  this.tetrinet_.sendField(this.gameArea_, this.oldGameArea_);

  // Copie de la grille actuelle.
  this.oldGameArea_ = new Array(22);
  for (var l = 0; l < 22; l++) {
    this.oldGameArea_[l] = new Array(12);
    for (var c = 0; c < 12; c++) {
      this.oldGameArea_[l][c] = this.gameArea_[l][c];
    }
  }
};


/**
 * @type {Array<Array<number>>}
 * @private
 */
tetriweb.Tetris.prototype.gameArea_ = null;

/**
 * @type {Array<Array<number>>}
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
 * @type {object}
 * @private
 */
tetriweb.Tetris.prototype.myField_ = null;

/**
 * @type {boolean}
 * @private
 */
tetriweb.Tetris.prototype.gameLost_ = false;
