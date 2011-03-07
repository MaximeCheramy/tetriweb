var Tetris = Class.create();
Tetris.prototype = {
  gameArea: new Array(22),
  cur_x: 6,
  cur_y: 0,
  current: null,
  currentObj: null,
  currentColor: null,
  montimer: null,
  pieceDropped: true,
  gameLost: false,
  next_id: null,
  next_o: null,
  tetrinet: null,
  oldField: null,

  initialize: function(tetrinet) {
    this.tetrinet = tetrinet;
    this.tetrinet.tetris = this;
  },

  init: function() {
    // init the game area : all empty.
    for (var l = 0; l < 22; l++) {
      this.gameArea[l] = new Array(12);
      for (var c = 0; c < 12; c++) {
        this.gameArea[l][c] = 0;
      }
    }

    this.generateRandom();
    this.newPiece();
    this.montimer = window.setTimeout(this.step.bind(this), 1000);
    //this.updateGrid();

    $('myfield').observe('keypress', this.touche.bind(this));
  },

  rotate: function(piece) {
    var npiece = new Array(4);
    for (var l = 0; l < 4; l++) {
      npiece[l] = new Array(4);
      for (var c = 0; c < 4; c++) {
        npiece[l][c] = piece[3 - c][l];
      }
    }
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
    return npiece;
  },

  generateRandom: function() {
    this.next_id = Math.floor(Math.random() * 7);
    this.next_o = Math.floor(Math.random() * 4);

    var nextpiece = this.generatePiece(this.next_id,
                                        this.next_o);
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
              this.getColor(this.next_id));
        }
      }
    }
  },

  generatePiece: function(id, orientation) {
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
  },

  newPiece: function() {
    // temp.
    this.cur_x = 5;
    this.cur_y = 0;

    this.current = this.generatePiece(this.next_id, this.next_o);
    this.currentColor = this.getColor(this.next_id);
    this.generateRandom();

    // Remonte un peu l'objet si commence par du vide.
    for (var l = 0; l < 4; l++) {
      var vide = true;
      for (var c = 0; c < 4; c++) {
        vide = vide && !this.current[l][c];
      }
      if (vide) {
        this.cur_y--;
      } else {
        break;
      }
    }

    this.updatePiece();
  },

  nukeField: function() {
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        this.gameArea[l][c] = 0;
      }
    }
    this.updateGrid();
  },

  updatePiece: function() {
    this.currentObj = document.createElement('div');
    var myfield = document.getElementById('myfield');
    myfield.appendChild(this.currentObj);
    this.currentObj.className = 'piece';
    this.currentObj.style.top = this.cur_y * 20;
    this.currentObj.style.left = this.cur_x * 20;
    for (var l = 0; l < 4; l++) {
      for (var c = 0; c < 4; c++) {
        if (this.current[l][c]) {
          bloc = document.createElement('div');
          this.currentObj.appendChild(bloc);
          bloc.className = 'block';
          bloc.style.top = l * 20 + 1;
          bloc.style.left = c * 20 + 1;
          bloc.style.background = this.convert(
              this.currentColor);
        }
      }
    }
  },

  convert: function(color) {
    switch (color) {
      case 1: return '#0000FF'; // bleu
      case 2: return '#FFFF00'; // jaune
      case 3: return '#00FF00'; // vert
      case 4: return '#800080'; // violet
      case 5: return '#FF0000'; // rouge
      default: alert('problème...');
    }
  },

  getColor: function(id) {
    switch (id) {
      case 0: return 1; // barre : bleu
      case 1: return 2; // carré : jaune
      case 2: return 3; // L gauche : vert
      case 3: return 4; // L droite : violet
      case 4: return 5; // Z : rouge
      case 5: return 1; // Z inversé : bleu
      case 6: return 2; // T : jaune
    }
  },

  updateGrid: function() {
    var myfield = document.getElementById('myfield');
    while (myfield.childNodes.length > 0) {
      myfield.removeChild(myfield.childNodes[0]);
    }

    // On reconstruit
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        if (this.gameArea[l][c] > 0) {
          bloc = document.createElement('div');
          myfield.appendChild(bloc);
          bloc.className = 'block';
          bloc.style.top = l * 20 + 1;
          bloc.style.left = c * 20 + 1;
          bloc.style.background = this.convert(
              this.gameArea[l][c]);
        }
      }
    }

    this.sendField();
  },

  fillRandomly: function() {
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        this.gameArea[l][c] = Math.ceil(Math.random() * 5);
      }
    }
    this.updateGrid();
  },

  addLine: function() {
    for (var c = 0; c < 12; c++) {
      if (this.gameArea[0][c] > 0) {
        this.gameLost = true;
      }
    }
    if (!this.gameLost) {
      // On decale tout vers le haut.
      for (var l = 1; l < 22; l++) {
        for (var c = 0; c < 12; c++) {
          this.gameArea[l - 1][c] = this.gameArea[l][c];
        }
      }

      for (var c = 0; c < 12; c++) {
        this.gameArea[21][c] = Math.floor(Math.random() * 6);
      }
      this.updateGrid();
    }
  },

  clearLine: function() {
    // On décale tout vers le bas.
    for (var l = 21; l > 0; l--) {
      for (var c = 0; c < 12; c++) {
        this.gameArea[l][c] = this.gameArea[l - 1][c];
      }
    }
    this.updateGrid();
  },

  blockGravity: function() {
    for (var l = 20; l >= 0; l--) {
      var g = false;
      for (var c = 0; c < 12; c++) {
        if (this.gameArea[l][c] > 0 && this.gameArea[l + 1][c] == 0) {
          this.gameArea[l + 1][c] = this.gameArea[l][c];
          this.gameArea[l][c] = 0;
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
  },

  checkLine: function() {
    var nbLines = 0;
    for (var l = 0; l < 22; l++) {
      var tetris = true;
      for (var c = 0; c < 12; c++) {
        tetris = tetris && (this.gameArea[l][c] > 0);
      }
      if (tetris) {
        nbLines++;
        for (var ll = l; ll > 0; ll--) {
          for (var c = 0; c < 12; c++) {
            this.gameArea[ll][c] = this.gameArea[ll - 1][c];
          }
        }
        for (var c = 0; c < 12; c++) {
          this.gameArea[0][c] = 0;
        }
      }
    }
    this.updateGrid();
    if (nbLines == 4) {
      this.tetrinet.sendLines(nbLines);
    } else if (nbLines > 1) {
      this.tetrinet.sendLines(nbLines - 1);
    }
  },

  printDebug: function() {
    // Debug !
    var debug = document.getElementById('debug');
    debug.innerHTML = '';
    for (var l = 0; l < 22; l++) {
      for (var c = 0; c < 12; c++) {
        if (l >= this.cur_y && l < this.cur_y + 4 &&
            c >= this.cur_x && c < this.cur_x + 4 &&
            this.current[l - this.cur_y][c - this.cur_x]) {
          debug.innerHTML += '#';
        } else {
          if (this.gameArea[l][c] > 0)
            debug.innerHTML += ' ';
          debug.innerHTML += this.gameArea[l][c];
        }
      }
      debug.innerHTML += '<br/>';
    }
  },

  sendField: function() {
    if (this.oldField == null) {
      this.oldField = new Array(22);
      for (var l = 0; l < 22; l++) {
        this.oldField[l] = new Array(12);
        for (var c = 0; c < 12; c++) {
          this.oldField[l][c] = 0;
        }
      }
    }

    this.tetrinet.sendField(this.gameArea, this.oldField);

    // copie
    this.oldField = new Array(22);
    for (var l = 0; l < 22; l++) {
      this.oldField[l] = new Array(12);
      for (var c = 0; c < 12; c++) {
        this.oldField[l][c] = this.gameArea[l][c];
      }
    }
  },

  step: function() {
    //this.printDebug();

    var stop = false;
    for (var l = 0; l < 4 && !stop; l++) {
      for (var c = 0; c < 4 && !stop; c++) {
        if (this.current[l][c]) {
          if (l + this.cur_y + 1 >= 22 ||
              this.gameArea[l + this.cur_y + 1][c + this.cur_x] > 0) {
            stop = true;
          }
        }
      }
    }
    if (!stop) {
      this.cur_y++;
      this.currentObj.style.top = this.cur_y * 20;
    } else {
      if (this.cur_y <= 0) {
        this.gameLost = true;
      }

     // On dépose les pièces
      for (var l = 0; l < 4; l++) {
        for (var c = 0; c < 4; c++) {
          if (this.current[l][c]) {
            this.gameArea[l + this.cur_y][c + this.cur_x] =
              this.currentColor;
            bloc = document.createElement('div');
            document.getElementById('myfield').appendChild(bloc);
            bloc.className = 'block';
            bloc.style.top = (this.cur_y + l) * 20 + 1;
            bloc.style.left = (this.cur_x + c) * 20 + 1;
            bloc.style.background = this.convert(this.currentColor);
          }
        }
      }
      this.pieceDropped = true;
      this.checkLine();
      this.sendField();
      this.newPiece();
    }
    if (!this.gameLost) {
      clearTimeout(this.montimer);
      this.montimer = window.setTimeout(this.step.bind(this), 1000);
    } else {
      this.tetrinet.sendPlayerlost();
      this.fillRandomly();
    }
  },

  touche: function(e) {
    e.stop();
    if (this.gameLost) return;
    if (e.keyCode == 38 || e.keyCode == 56) {
      piece = this.rotate(this.current);
      // verifie si new ok.
      var ok = true;

      for (var l = 0; l < 4 && ok; l++) {
        for (var c = 0; c < 4 && ok; c++) {
          if (piece[l][c]) {
            ok = (this.cur_x + c) >= 0 &&
              (this.cur_x + c) < 12 &&
              (this.cur_y + l) >= 0 &&
              (this.cur_y + l) < 22 &&
              this.gameArea[this.cur_y + l][this.cur_x + c] == 0;
          }
        }
      }

      if (ok) {
        this.current = piece;
        document.getElementById('myfield').removeChild(this.currentObj);
        this.updatePiece();
      }
    }
    if (e.keyCode == 39 || e.keyCode == 54) {
      var ok = true;
      for (var l = 0; l < 4 && ok; l++) {
        for (var c = 0; c < 4 && ok; c++) {
          if (this.current[l][c]) {
            if (c + this.cur_x + 1 >= 12 ||
                this.gameArea[l + this.cur_y][c + this.cur_x + 1] > 0) {
              ok = false;
            }
          }
        }
      }
      if (ok) {
        this.cur_x++;
      }
    }
    if (e.keyCode == 37 || e.keyCode == 52) {
      var ok = true;
      for (var l = 0; l < 4 && ok; l++) {
        for (var c = 0; c < 4 && ok; c++) {
          if (this.current[l][c]) {
            if (c + this.cur_x - 1 < 0 ||
                this.gameArea[l + this.cur_y][c + this.cur_x - 1] > 0) {
              ok = false;
            }
          }
        }
      }
      if (ok) {
        this.cur_x--;
      }

    }
    if (e.keyCode == 40 || e.keyCode == 50) {
      clearTimeout(this.montimer);
      this.step();
    }

    if (e.charCode == 32) {
      this.pieceDropped = false;
      while (!this.pieceDropped) {
        this.step();
      }
    }

    this.currentObj.style.left = this.cur_x * 20;
  }
};
