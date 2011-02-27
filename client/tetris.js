var Tetris = Class.create();
Tetris.prototype = {
	gamearea: new Array(22),
	cur_x: 6,
	cur_y: 0,
	current: null,
	currentobj: null,
	currentcolor: null,
	montimer: null,
	piecedepose: true,
	perdu: false,
	next_id: null,
	next_o: null,
	tetrinet: null,

	initialize: function(tetrinet) {
		this.tetrinet = tetrinet;
		this.tetrinet.tetris = this;
	},

	init: function() {
		// init the game area : all empty.
		for (var l = 0; l < 22; l++) {
			this.gamearea[l] = new Array(12);
			for (var c = 0; c < 12; c++) {
				this.gamearea[l][c] = 0;
			}
		}

		this.generate_random();
		this.newpiece();

		this.montimer = window.setTimeout(this.step.bind(this), 1000);
		
		$('myfield').observe('keypress', this.touche.bind(this));
	},

	rotate: function(piece) {
		var npiece = new Array(4);
		for (var l = 0; l < 4; l++) {
			npiece[l] = new Array(4);
			for (var c = 0; c < 4; c++) {
				npiece[l][c] = piece[3-c][l];
			}
		}
		return npiece;
	},

	generate_random: function() {
		this.next_id = Math.floor(Math.random() * 7);
		this.next_o = Math.floor(Math.random() * 4);

		var nextpiece = this.generate_piece(this.next_id, this.next_o);
		var nextpieceobj = document.getElementById("nextpiece");
		while (nextpieceobj.childNodes.length > 0) {
			nextpieceobj.removeChild(nextpieceobj.childNodes[0]);
		}
		for (var l = 0; l < 4; l++) {
			for (var c = 0; c < 4; c++) {
				if (nextpiece[l][c]) {
					var bloc = document.createElement("div");
					nextpieceobj.appendChild(bloc);
					bloc.className = 'bloc';
					bloc.style.top = l * 20 + 1;
					bloc.style.left = c * 20 + 1;
					bloc.style.background = this.convert(this.get_color(this.next_id));
				}
			}
		}

	},

	generate_piece: function(id, orientation) {
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

	newpiece: function() {
		// temp.
		this.cur_x = 5;
		this.cur_y = 0;

		this.current = this.generate_piece(this.next_id, this.next_o);
		this.currentcolor = this.get_color(this.next_id);
		this.generate_random();

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
		
		this.actualise_piece();
	},

	actualise_piece: function() {
		this.currentobj = document.createElement("div");
		document.getElementById("myfield").appendChild(this.currentobj);
		this.currentobj.className = 'piece';
		this.currentobj.style.top = this.cur_y * 20;
		this.currentobj.style.left = this.cur_x * 20;
		for (var l = 0; l < 4; l++) {
			for (var c = 0; c < 4; c++) {
				if (this.current[l][c]) {
					bloc = document.createElement("div");
					this.currentobj.appendChild(bloc);
					bloc.className = 'bloc';
					bloc.style.top = l * 20 + 1;
					bloc.style.left = c * 20 + 1;
					bloc.style.background = this.convert(this.currentcolor);
				}
			}
		}
	},

	convert: function(color) {
		switch (color) {
			case 1: return "#0000FF"; // bleu
			case 2: return "#FFFF00"; // jaune
			case 3: return "#00FF00"; // vert
			case 4: return "#800080"; // violet
			case 5: return "#FF0000"; // rouge
			default: alert('problème...');
		}
	},

	get_color: function(id) {
		switch(id) {
			case 0: return 1; // barre : bleu
			case 1: return 2; // carré : jaune
			case 2: return 3; // L gauche : vert
			case 3: return 4; // L droite : violet
			case 4: return 5; // Z : rouge
			case 5: return 1; // Z inversé : bleu
			case 6: return 2; // T : jaune
		}
	},

	actualise_grille: function() {
		myfield = document.getElementById("myfield");
		while (myfield.childNodes.length > 0) {
			myfield.removeChild(myfield.childNodes[0]);
		}

		// On reconstruit
		for (var l = 0; l < 22; l++) {
			for (var c = 0; c < 12; c++) {
				if (this.gamearea[l][c] > 0) {
					bloc = document.createElement("div");
					document.getElementById("myfield").appendChild(bloc);
					bloc.className = 'bloc';
					bloc.style.top = l * 20 + 1;
					bloc.style.left = c * 20 + 1;
					bloc.style.background = this.convert(this.gamearea[l][c]);
				}
			}
		}
	},

	checktetris: function() {
		for (var l = 0; l < 22; l++) {
			var tetris = true;
			for (var c = 0; c < 12; c++) {
				tetris = tetris && (this.gamearea[l][c] > 0);
			}
			if (tetris) {
				for (var ll = l; ll > 0; ll--) {
					for (var c = 0; c < 12; c++) {
						this.gamearea[ll][c] = this.gamearea[ll-1][c];
					}
				}
				for (var c = 0; c < 12; c++) {
					this.gamearea[0][c] = 0;
				}
			}
		}
		this.actualise_grille();
	},

	print_debug: function() {
		// Debug !
		document.getElementById("debug").innerHTML = "";
		for (var l = 0; l < 22; l++) {
			for (var c = 0; c < 12; c++) {
				if (l >= this.cur_y && l < this.cur_y + 4 &&
					 c >= this.cur_x && c < this.cur_x + 4 &&
						this.current[l-this.cur_y][c-this.cur_x]) {
					document.getElementById("debug").innerHTML += "#";
				} else {
					if (this.gamearea[l][c] > 0)
						document.getElementById("debug").innerHTML += " ";
					document.getElementById("debug").innerHTML += this.gamearea[l][c];
				}
			}
			document.getElementById("debug").innerHTML += "<br/>";
		}
	},

	step: function() {
		//this.print_debug();

		var stop = false;
		for (var l = 0; l < 4 && !stop; l++) {
			for (var c = 0; c < 4 && !stop; c++) {
				if (this.current[l][c]) {
					if (l+this.cur_y+1 >= 22 || this.gamearea[l+this.cur_y+1][c+this.cur_x] > 0) {
						stop = true;
					}
				}
			}
		}
		if (!stop) {
			this.cur_y++;
			this.currentobj.style.top = this.cur_y * 20;
		} else {
			if (this.cur_y <= 0) {
				this.perdu = true;
			}

			var oldfield = new Array(22);
			for (var l = 0; l < 22; l++) {
				oldfield[l] = new Array(12);
				for(var c = 0; c < 12; c++) {
					oldfield[l][c] = this.gamearea[l][c];
				}
			}

			// On dépose les pièces
			for (var l = 0; l < 4; l++) {
				for (var c = 0; c < 4; c++) {
					if (this.current[l][c]) {
						this.gamearea[l+this.cur_y][c+this.cur_x] = this.currentcolor;
						bloc = document.createElement("div");
						document.getElementById("myfield").appendChild(bloc);
						bloc.className = 'bloc';
						bloc.style.top = (this.cur_y + l) * 20 + 1;
						bloc.style.left = (this.cur_x + c) * 20 + 1;
						bloc.style.background = this.convert(this.currentcolor);
					}
				}
			}
			this.piecedepose = true;
			this.checktetris();
			this.tetrinet.sendField(this.gamearea, oldfield);
			this.newpiece();
		}
		if (!this.perdu) {
			clearTimeout(this.montimer);
			this.montimer = window.setTimeout(this.step.bind(this), 1000);
		} else {
			window.alert("Perdu !");
		}
	},

	touche: function(e) {
		e.stop();
		if (this.perdu) return;
	//		this.print_debug();
		if (e.keyCode == 38 || e.keyCode == 56) {
			piece = this.rotate(this.current);
			// verifie si new ok.
			var ok = true;

			for (var l = 0; l < 4 && ok; l++) {
				for (var c = 0; c < 4 && ok; c++) {
					if (piece[l][c]) {
						ok = (this.cur_x + c) >= 0 && (this.cur_x + c) < 12 && (this.cur_y + l) < 22 && this.gamearea[this.cur_y+l][this.cur_x+c] == 0;
					}
				}
			}


			if (ok) {
				this.current = piece;
				document.getElementById("myfield").removeChild(this.currentobj);
				this.actualise_piece();
			}
		}
		if (e.keyCode == 39 || e.keyCode == 54) {
			var ok = true;
			for (var l = 0; l < 4 && ok; l++) {
				for (var c = 0; c < 4 && ok; c++) {
					if (this.current[l][c]) {
						if (c+this.cur_x+1 >= 12 || this.gamearea[l+this.cur_y][c+this.cur_x+1] > 0) {
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
						if (c+this.cur_x-1 < 0 || this.gamearea[l+this.cur_y][c+this.cur_x-1] > 0) {
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
			this.piecedepose = false;
			while (!this.piecedepose) {
				this.step();
			}
		}

		this.currentobj.style.left = this.cur_x * 20;
	}
}
