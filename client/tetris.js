goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');

goog.provide('tetriweb.Tetris');

/**
 * Tetris.
 * @param {object} tetrinet_ L'objet tetrinet.
 * @constructor
 */
tetriweb.Tetris = function(_tetrinet) {
  // TODO: Les variables locales devraient etre def en dehors du constructeur
  // sous la forme: tetriweb.Tetris.variable_.
  var gameArea = new Array(22);
  var myField = null;
  var cur_x = 6;
  var cur_y = 0;
  var current = null;
  var currentObj = null;
  var currentColor = null;
  var montimer = null;
  var pieceDropped = true;
  var gameLost = false;
  var next_id = null;
  var next_o = null;
  var tetrinet = null;
  var oldField = null;
  var specialLines = null;
  var specialCount = null;
  var specialCapacity = null;
  var currentSpecialLines = null;
  var specialsQueue = null;

  tetrinet = _tetrinet;
  tetrinet.tetris = this;

  //TODO: Deplacer les fonctions vers tetriweb.Tetris.fonction et en dehors du constructeur.
  this.init = function(_specialLines, _specialCount, _specialCapacity) {
    // init the game area : all empty.
    for (var l = 0; l < 22; l++) {
      gameArea[l] = new Array(12);
      for (var c = 0; c < 12; c++) {
        gameArea[l][c] = 0;
      }
    }

    gameLost = false;
    specialLines = _specialLines;
    specialCount = _specialCount;
    specialCapacity = _specialCapacity;
    currentSpecialLines = 0;
    specialsQueue = [];

    myField = goog.dom.getElement('myfield');

    this.updateGrid();
    this.generateRandom();
    this.newPiece();
    montimer = window.setTimeout(goog.bind(this.step, this), 1000);

    goog.events.removeAll(myField);
    goog.events.listen(myField, goog.events.EventType.KEYPRESS,
      goog.bind(this.keyHandler, this));
  };

  this.generateRandom = function() {
    next_id = Math.floor(Math.random() * 7);
    next_o = Math.floor(Math.random() * 4);

    var nextpiece = this.generatePiece(next_id, next_o);
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

  this.generatePiece = function(id, orientation) {
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
      piece = this.rotate(piece);
      orientation--;
    }

    return piece;
  };

  this.newPiece = function() {
    // temp.
    cur_x = 5;
    cur_y = 0;

    current = this.generatePiece(next_id, next_o);
    currentColor = this.getColor(next_id);
    this.generateRandom();

    // Remonte un peu l'objet si commence par du vide.
    for (var l = 0; l < 4; l++) {
      var vide = true;
      for (var c = 0; c < 4; c++) {
        vide = vide && !current[l][c];
      }
      if (vide) {
        cur_y--;
      } else {
        break;
      }
    }

    this.updatePiece();
  };

  this.nukeField = function() {
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        gameArea[l][c] = 0;
      }
    }
    this.updateGrid();
  };

  this.updatePiece = function() {
    currentObj = goog.dom.createDom('div', {class: 'piece'});
    currentObj.style.top = cur_y * 20;
    currentObj.style.left = cur_x * 20;
    goog.dom.appendChild(myField, currentObj);
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

  this.updateGrid = function() {
    var fieldContent = goog.array.clone(myField.childNodes);
    goog.array.forEach(fieldContent, function(n) {
      if (n != currentObj) {
        goog.dom.removeNode(n);
      }
    }, this);

    // On reconstruit
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        if (gameArea[l][c] > 0) {
          var bloc = goog.dom.createDom('div');
          bloc.style.top = l * 20 + 1;
          bloc.style.left = c * 20 + 1;
          bloc.className = 'block ' + this.convert(gameArea[l][c]);
          myField.appendChild(bloc);
        }
      }
    }

    this.sendField();
  };

  this.fillRandomly = function() {
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        gameArea[l][c] = Math.ceil(Math.random() * 5);
      }
    }
    this.updateGrid();
  };

  this.addLine = function() {
    for (var c = 0; c < 12; c++) {
      if (gameArea[0][c] > 0) {
        gameLost = true;
      }
    }
    if (!gameLost) {
      // On decale tout vers le haut.
      for (var l = 1; l < 22; l++) {
        for (var c = 0; c < 12; c++) {
          gameArea[l - 1][c] = gameArea[l][c];
        }
      }

      for (var c = 0; c < 12; c++) {
        gameArea[21][c] = Math.floor(Math.random() * 6);
      }
      this.updateGrid();
    }
  };

  this.clearLine = function() {
    // On décale tout vers le bas.
    for (var l = 21; l > 0; l--) {
      for (var c = 0; c < 12; c++) {
        gameArea[l][c] = gameArea[l - 1][c];
      }
    }
    this.updateGrid();
  };

  this.blockGravity = function() {
    for (var l = 20; l >= 0; l--) {
      var g = false;
      for (var c = 0; c < 12; c++) {
        if (gameArea[l][c] > 0 && gameArea[l + 1][c] == 0) {
          gameArea[l + 1][c] = gameArea[l][c];
          gameArea[l][c] = 0;
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

  this.checkLine = function() {
    var nbLines = 0;
    var tmpSpecials = [];
    for (var l = 0; l < 22; l++) {
      var tetris = true;
      for (var c = 0; c < 12; c++) {
        tetris = tetris && (gameArea[l][c] > 0);
      }
      if (tetris) {
        nbLines++;
        // Take specials
        for (var c = 0; c < 12; c++) {
          if (gameArea[l][c] > 5) {
            tmpSpecials.push(gameArea[l][c]);
          }
        }
        for (var ll = l; ll > 0; ll--) {
          for (var c = 0; c < 12; c++) {
            gameArea[ll][c] = gameArea[ll - 1][c];
          }
        }
        for (var c = 0; c < 12; c++) {
          gameArea[0][c] = 0;
        }
      }
    }
    this.updateGrid();
    if (nbLines == 4) {
      tetrinet.sendLines(nbLines);
    } else if (nbLines > 1) {
      tetrinet.sendLines(nbLines - 1);
    }

    //console.log(tmpSpecials);

    // Special handling
    currentSpecialLines += nbLines;
    this.placeSpecials((currentSpecialLines / specialLines) * specialCount);
    currentSpecialLines %= specialLines;
  };

  this.placeSpecials = function(nb) {
    var availBlocks = 0;
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        if (gameArea[l][c] > 0 && gameArea[l][c] <= 5) {
          availBlocks++;
        }
      }
    }
    var blocksToPlace = Math.min(nb, availBlocks);

    //console.log('availBlocks : ' + availBlocks);
    //console.log('blocksToPlace : ' + blocksToPlace);

    for (var i = 0; i < blocksToPlace; i++) {
       var special = Math.round(Math.random() * 8) + 6;
       var place = Math.round(Math.random() * (availBlocks - i - 1));
       //console.log('place : ' + place);
       for (var l = 0; place >= 0 && l < 22; l++) {
         for (var c = 0; place >= 0 && c < 12; c++) {
           if (gameArea[l][c] > 0 && gameArea[l][c] <= 5) {
             if (place == 0) {
               gameArea[l][c] = special;
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

  this.printDebug = function() {
    // Debug !
    var debug = goog.dom.getElement('debug');
    debug.innerHTML = '';
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        if (l >= cur_y && l < cur_y + 4 &&
            c >= cur_x && c < cur_x + 4 &&
            current[l - cur_y][c - cur_x]) {
          debug.innerHTML += '#';
        } else {
          if (gameArea[l][c] > 0)
            debug.innerHTML += ' ';
          debug.innerHTML += gameArea[l][c];
        }
      }
      debug.innerHTML += '<br/>';
    }
  };

  /**
   * Fonction qui permet l'envoie au serveur tetrinet de la grille de jeu.
   */
  this.sendField = function() {
    // Si c'est le premier appel.
    if (oldField == null) {
      oldField = new Array(22);
      for (var l = 0; l < 22; l++) {
        oldField[l] = new Array(12);
        for (var c = 0; c < 12; c++) {
          oldField[l][c] = 0;
        }
      }
    }

    // On envoie la nouvelle grille.
    tetrinet.sendField(gameArea, oldField);

    // Copie de la grille actuelle.
    oldField = new Array(22);
    for (var l = 0; l < 22; l++) {
      oldField[l] = new Array(12);
      for (var c = 0; c < 12; c++) {
        oldField[l][c] = gameArea[l][c];
      }
    }
  };

  /**
   * Fonction appelée périodiquement pour faire avancer le jeu.
   */
  this.step = function() {
    //TODO: Commenter le workflow du moteur de jeu.
    //this.printDebug();

    var stop = false;
    for (var l = 0; l < 4 && !stop; l++) {
      for (var c = 0; c < 4 && !stop; c++) {
        if (current[l][c]) {
          if (l + cur_y + 1 >= 22 || gameArea[l + cur_y + 1][c + cur_x] > 0) {
            stop = true;
          }
        }
      }
    }
    if (!stop) {
      cur_y++;
      currentObj.style.top = cur_y * 20;
    } else {
      if (cur_y <= 0) {
        gameLost = true;
      }

      // On dépose les pièces
      for (var l = 0; l < 4; l++) {
        for (var c = 0; c < 4; c++) {
          if (current[l][c]) {
            gameArea[l + cur_y][c + cur_x] = currentColor;
            var bloc = goog.dom.createDom('div');
            bloc.style.top = (cur_y + l) * 20 + 1;
            bloc.style.left = (cur_x + c) * 20 + 1;
            bloc.className = 'block ' + this.convert(currentColor);
            goog.dom.appendChild(myField, bloc);
          }
        }
      }
      goog.dom.removeNode(currentObj);
      pieceDropped = true;
      this.checkLine();
      this.sendField();
      this.newPiece();
    }
    if (!gameLost) {
      clearTimeout(montimer);
      montimer = window.setTimeout(goog.bind(this.step, this), 1000);
    } else {
      tetrinet.sendPlayerlost();
      this.fillRandomly();
    }
  };

  /**
   * Fonction appelée lors de l'appuie d'une touche sur le tetris.
   * @param {object} e L'event.
   */
  this.keyHandler = function(e) {
    // TODO: Séparer en plusieurs fonctions ? Oui/Non ?

    // Stop la propagation de l'event.
    e.preventDefault();

    // Si la partie est perdue alors on ne fait rien.
    if (gameLost) return;

    // Touche haut ou 8.
    if (e.keyCode == 38 || e.keyCode == 56) {
      piece = this.rotate(current);
      // verifie si new ok.
      var ok = true;

      for (var l = 0; l < 4 && ok; l++) {
        for (var c = 0; c < 4 && ok; c++) {
          if (piece[l][c]) {
            ok = (cur_x + c) >= 0 &&
              (cur_x + c) < 12 &&
              (cur_y + l) >= 0 &&
              (cur_y + l) < 22 &&
              gameArea[cur_y + l][cur_x + c] == 0;
          }
        }
      }

      if (ok) {
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
            if (c + cur_x + 1 >= 12 ||
                gameArea[l + cur_y][c + cur_x + 1] > 0) {
              ok = false;
            }
          }
        }
      }
      if (ok) {
        cur_x++;
      }
    }

    // Touche gauche.
    if (e.keyCode == 37 || e.keyCode == 52) {
      var ok = true;
      for (var l = 0; l < 4 && ok; l++) {
        for (var c = 0; c < 4 && ok; c++) {
          if (current[l][c]) {
            if (c + cur_x - 1 < 0 || gameArea[l + cur_y][c + cur_x - 1] > 0) {
              ok = false;
            }
          }
        }
      }
      if (ok) {
        cur_x--;
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

    // Actualise la position de la piece.
    currentObj.style.left = cur_x * 20;
  };

  /**
   * Rotation d'une piece de 90° dans le sens horaire.
   * @param {Array.<Array<number>>} piece La piece que l'on veut faire pivoter.
   * @return {Array.<Array<number>>} La piece retournée.
   */
  this.rotate = function(piece) {
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
};
