/**
 * Tetris.
 * @param {object} tetrinet_ L'objet tetrinet.
 * @constructor
 */
function Tetris(tetrinet_) {
  var gameArea = new Array(22);
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

  tetrinet = tetrinet_;
  tetrinet.tetris = this;

  this.init = function() {
    // init the game area : all empty.
    for (var l = 0; l < 22; l++) {
      gameArea[l] = new Array(12);
      for (var c = 0; c < 12; c++) {
        gameArea[l][c] = 0;
      }
    }

    gameLost = false;

    this.updateGrid();
    this.generateRandom();
    this.newPiece();
    montimer = window.setTimeout(this.step.bind(this), 1000);

    $('myfield').stopObserving();
    $('myfield').observe('keypress', this.keyHandler.bind(this));
  };

  this.generateRandom = function() {
    next_id = Math.floor(Math.random() * 7);
    next_o = Math.floor(Math.random() * 4);

    var nextpiece = this.generatePiece(next_id,
                                        next_o);
    var nextpieceobj = document.getElementById('nextpiece');
    while (nextpieceobj.childNodes.length > 0) {
      nextpieceobj.removeChild(nextpieceobj.childNodes[0]);
    }
    for (var l = 0; l < 4; l++) {
      for (var c = 0; c < 4; c++) {
        if (nextpiece[l][c]) {
          var bloc = document.createElement('div');
          nextpieceobj.appendChild(bloc);
          bloc.className = 'block';
          bloc.style.top = l * 20 + 1;
          bloc.style.left = c * 20 + 1;
          bloc.style.background = this.convert(
              this.getColor(next_id));
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
    currentObj = document.createElement('div');
    var myfield = document.getElementById('myfield');
    myfield.appendChild(currentObj);
    currentObj.className = 'piece';
    currentObj.style.top = cur_y * 20;
    currentObj.style.left = cur_x * 20;
    for (var l = 0; l < 4; l++) {
      for (var c = 0; c < 4; c++) {
        if (current[l][c]) {
          bloc = document.createElement('div');
          currentObj.appendChild(bloc);
          bloc.className = 'block';
          bloc.style.top = l * 20 + 1;
          bloc.style.left = c * 20 + 1;
          bloc.style.background = this.convert(
              currentColor);
        }
      }
    }
  };

  this.convert = function(color) {
    switch (color) {
      case 1: return '#0000FF'; // bleu
      case 2: return '#FFFF00'; // jaune
      case 3: return '#00FF00'; // vert
      case 4: return '#800080'; // violet
      case 5: return '#FF0000'; // rouge
      default: alert('problème...');
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
    }
  };

  this.updateGrid = function() {
    var myfield = document.getElementById('myfield');
    myfield.childElements().each(function(el) {
      if (el != currentObj) {
        el.remove();
      }
    }.bind(this));

    // On reconstruit
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        if (gameArea[l][c] > 0) {
          bloc = document.createElement('div');
          myfield.appendChild(bloc);
          bloc.className = 'block';
          bloc.style.top = l * 20 + 1;
          bloc.style.left = c * 20 + 1;
          bloc.style.background = this.convert(
              gameArea[l][c]);
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
    for (var l = 0; l < 22; l++) {
      var tetris = true;
      for (var c = 0; c < 12; c++) {
        tetris = tetris && (gameArea[l][c] > 0);
      }
      if (tetris) {
        nbLines++;
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
  };

  this.printDebug = function() {
    // Debug !
    var debug = document.getElementById('debug');
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
          if (l + cur_y + 1 >= 22 ||
              gameArea[l + cur_y + 1][c + cur_x] > 0) {
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
            gameArea[l + cur_y][c + cur_x] =
              currentColor;
            bloc = document.createElement('div');
            document.getElementById('myfield').appendChild(bloc);
            bloc.className = 'block';
            bloc.style.top = (cur_y + l) * 20 + 1;
            bloc.style.left = (cur_x + c) * 20 + 1;
            bloc.style.background = this.convert(currentColor);
          }
        }
      }
      document.getElementById('myfield').removeChild(currentObj);
      pieceDropped = true;
      this.checkLine();
      this.sendField();
      this.newPiece();
    }
    if (!gameLost) {
      clearTimeout(montimer);
      montimer = window.setTimeout(this.step.bind(this), 1000);
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
    e.stop();

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
        document.getElementById('myfield').removeChild(currentObj);
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
            if (c + cur_x - 1 < 0 ||
                gameArea[l + cur_y][c + cur_x - 1] > 0) {
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
        for (l = 0; l < 3; l++) {
          for (c = 0; c < 4; c++) {
            npiece[l][c] = npiece[l + 1][c];
          }
        }
        for (c = 0; c < 4; c++) {
          npiece[3][c] = false;
        }
      }
      done_l = npiece[0][0] || npiece[1][0] || npiece[2][0] || npiece[3][0];
      if (!done_l) {
        for (l = 0; l < 4; l++) {
          for (c = 0; c < 3; c++) {
            npiece[l][c] = npiece[l][c + 1];
          }
        }
        for (l = 0; l < 4; l++) {
          npiece[l][3] = false;
        }
      }
    } while (!(done_l && done_t));

    // Retourne la nouvelle piece.
    return npiece;
  }

}
