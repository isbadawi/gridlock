import { LEVELS } from "./levels.js";

const HORIZONTAL = Symbol.for('horizontal');
const VERTICAL = Symbol.for('vertical');

class Level {
  constructor(n, pieces) {
    this.n = n;
    this.pieces = pieces;
  }

  // e.g.
  //
  // WWEEEB
  // ..F..B
  // RRF..D
  // ..F..D
  // XYY.Z.
  // X...Z.
  //
  // should return
  //
  // {
  //   n: 6,
  //   pieces: [
  //     {name: 'W', x: 0, y: 0, orientation: HORIZONTAL, size: 2},
  //     {name: 'E', x: 2, y: 0, orientation: HORIZONTAL, size: 3},
  //     {name: 'B', x: 5, y: 0, orientation: VERTICAL, size: 2},
  //     {name: 'F', x: 2, y: 1, orientation: VERTICAL, size: 3},
  //     {name: 'R', x: 0, y: 2, orientation: HORIZONTAL, size: 2},
  //     {name: 'D', x: 5, y: 2, orientation: VERTICAL, size: 2},
  //     {name: 'X', x: 0, y: 4, orientation: VERTICAL, size: 2},
  //     {name: 'Y', x: 1, y: 4, orientation: HORIZONTAL, size: 2},
  //     {name: 'Z', x: 4, y: 4, orientation: VERTICAL, size: 2},
  //   ]
  // }
  //
  // 'R' is assumed to be the main piece. For now only supports square grids.
  static parse(description) {
    let seen = {};
    let rows = description.trim().split('\n');
    let n = rows.length;
    for (let [rowIndex, row] of rows.entries()) {
      if (row.length != n) {
        throw Error('expected square grid of size ' + n);
      }
      for (let [colIndex, cell] of row.split('').entries()) {
        if (cell == '.') {
          continue;
        }

        if (!(cell in seen)) {
          seen[cell] = {
            name: cell,
            x: colIndex,
            y: rowIndex,
            orientation: HORIZONTAL,
            size: 1
          };
        } else {
          seen[cell].size++;
          if (rowIndex == seen[cell].y) {
            seen[cell].orientation = HORIZONTAL;
          } else if (colIndex == seen[cell].x) {
            seen[cell].orientation = VERTICAL;
          } else {
            throw Error('non-straight-line piece? ' + cell);
          }
        }
      }
    }

    if (!('R' in seen)) {
      throw Error('did not find main piece R');
    }

    return new Level(n, Object.values(seen));
  }

  pieceAt(x, y) {
    return this.pieces.find(piece => (
      (piece.orientation == VERTICAL &&
       piece.x == x &&
       piece.y <= y && y < piece.y + piece.size) ||
      (piece.orientation == HORIZONTAL &&
       piece.y == y &&
       piece.x <= x && x < piece.x + piece.size)
    ));
  }

  canMoveTo(x, y) {
    return (
      0 <= x && x < this.n &&
      0 <= y && y < this.n &&
      !this.pieceAt(x, y)
    );
  }

  moveByOne(x, y, by) {
    if (by != 1 && by != -1) {
      throw Error('can only move by 1');
    }

    let piece = this.pieceAt(x, y);
    if (!piece) {
      throw Error('no piece at ' + JSON.stringify({x: x, y: y}));
    }

    if (piece.orientation == HORIZONTAL) {
      let destX = by == -1 ? piece.x - 1 : piece.x + piece.size;
      if (!this.canMoveTo(destX, piece.y)) {
        throw Error("can't move to " + JSON.stringify({x: destX, y: piece.x}));
      }
      piece.x += by;
    } else if (piece.orientation == VERTICAL) {
      let destY = by == -1 ? piece.y - 1 : piece.y + piece.size;
      if (!this.canMoveTo(piece.x, destY)) {
        throw Error("can't move to " + JSON.stringify({x: piece.x, y: destY}));
      }
      piece.y += by;
    }
  }

  move(x, y, toX, toY) {
    let piece = this.pieceAt(x, y);
    if (!piece) {
      throw Error('no piece at ' + JSON.stringify({x: x, y: y}));
    }

    if (piece.orientation == HORIZONTAL) {
      if (y != toY) {
        throw Error('stay in same lane horizontal');
      }
      for (let i = 0; i < x - toX; ++i) {
        this.moveByOne(x, y, -1);
      }
      for (let i = 0; i < toX - (x + piece.size - 1); ++i) {
        this.moveByOne(x, y, 1);
      }
    } else if (piece.orientation == VERTICAL) {
      if (x != toX) {
        throw Error('stay in same lane vertical');
      }
      for (let i = 0; i < y - toY; ++i) {
        this.moveByOne(x, y, -1);
      }
      for (let i = 0; i < toY - (y + piece.size - 1); ++i) {
        this.moveByOne(x, y, 1);
      }
    }
  }
}

const CELL_SIZE = 100;

class Game {
  constructor(canvas, level, callback) {
    this.canvas = canvas;
    this.level = level;
    this.callback = callback;
    this.solved = false;

    this.onMouseUp();
  }

  draw() {
    let colors = {
      'G': 'seagreen',
      'g': 'lightgreen',
      'Y': 'gold',
      'y': 'khaki',
      'M': 'rebeccapurple',
      'm': 'mediumpurple',
      'P': 'palevioletred',
      'B': 'dimgrey',
      'b': 'sienna',
      'R': 'red',
      'r': 'tan',
      'N': 'royalblue',
      'O': 'orange',
      'o': 'darkolivegreen',
      'C': 'deepskyblue',
      'T': 'teal',
    };

    let ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let piece of this.level.pieces) {
      let x = piece.x * CELL_SIZE;
      let y = piece.y * CELL_SIZE;
      let width = piece.orientation == VERTICAL ? CELL_SIZE : piece.size * CELL_SIZE;
      let height = piece.orientation == HORIZONTAL ? CELL_SIZE : piece.size * CELL_SIZE;

      if (!(piece.name in colors)) {
        throw Error('unsupported color: ' + piece.name);
      }

      ctx.fillStyle = colors[piece.name];
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      if (piece == this.selectedPiece) {
        ctx.lineWidth = 5;
      }
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }

    ctx.lineWidth = 5;
    ctx.strokeStyle = 'black';
    ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = 'white';
    ctx.strokeRect(this.canvas.width, 2 * CELL_SIZE, 0, CELL_SIZE);
  }

  toCanvasCoordinates(e) {
    let rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  onMouseDown(e) {
    if (this.solved) {
      return;
    }

    let pos = this.toCanvasCoordinates(e);
    let x = Math.floor(pos.x / CELL_SIZE);
    let y = Math.floor(pos.y / CELL_SIZE);
    this.selectedPiece = this.level.pieceAt(x, y);
    this.draw();
  }

  onMouseUp(e) {
    if (this.solved) {
      return;
    }

    this.selectedPiece = null;
    this.draw();
  }

  onMouseMove(e) {
    if (this.solved) {
      return;
    }

    if (this.selectedPiece == null) {
      return;
    }

    let pos = this.toCanvasCoordinates(e);

    let fromX = this.selectedPiece.x;
    let fromY = this.selectedPiece.y;

    let toX = Math.floor(pos.x / CELL_SIZE);
    let toY = Math.floor(pos.y / CELL_SIZE);

    try {
      this.level.move(fromX, fromY, toX, toY);
      this.draw();
    } catch (e) {
    }

    if (this.selectedPiece.name == 'R' &&
        this.selectedPiece.x == this.level.n - this.selectedPiece.size) {
      this.solved = true;
      this.callback();
    }
  }
}

(function startGame() {
  let canvas = document.getElementById('grid');
  if (!canvas.getContext) {
    return;
  }

  let progress = window.localStorage.getItem('progress');
  if (progress) {
    progress = JSON.parse(progress);
  } else {
    progress = [];
    for (let _ of LEVELS) {
      progress.push(false);
    }
  }

  const params = new URLSearchParams(window.location.search);
  let which = parseInt(params.get('level') || '1') - 1;
  document.getElementById('current').innerHTML += (which + 1);

  let progressUI = '';
  for (let i = 0; i < LEVELS.length; ++i) {
    let clazz = progress[i] ? 'level solved' : 'level unsolved';
    progressUI += '<a href="?level=' + (i + 1) + '"><div id="level' + (i + 1) + '" class="' + clazz + '">' + (i + 1) + '</div>';
  }
  document.getElementById('levels').innerHTML += progressUI;

  let level = Level.parse(LEVELS[which]);
  let game = new Game(canvas, level, function() {
    document.getElementById('level' + (which + 1)).className = 'level solved';
    progress[which] = true;
    window.localStorage.setItem('progress', JSON.stringify(progress));
  });

  game.draw();
  canvas.addEventListener('mousedown', game.onMouseDown.bind(game), false);
  canvas.addEventListener('mouseup', game.onMouseUp.bind(game), false);
  canvas.addEventListener('mousemove', game.onMouseMove.bind(game), false);

})();
