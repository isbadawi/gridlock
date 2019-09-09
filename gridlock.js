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
  //     {x: 0, y: 0, orientation: HORIZONTAL, size: 2}, // W
  //     {x: 2, y: 0, orientation: HORIZONTAL, size: 3}, // E
  //     {x: 5, y: 0, orientation: VERTICAL, size: 2}, // B
  //     {x: 2, y: 1, orientation: VERTICAL, size: 3}, // F
  //     {x: 0, y: 2, orientation: HORIZONTAL, size: 2, main: true }, R
  //     {x: 5, y: 2, orientation: VERTICAL, size: 2}, // D
  //     {x: 0, y: 4, orientation: VERTICAL, size: 2}, // X
  //     {x: 1, y: 4, orientation: HORIZONTAL, size: 2}, // Y
  //     {x: 4, y: 4, orientation: VERTICAL, size: 2}, // Z
  //   ]
  // }
  //
  // For now only supports square grids.
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
          seen[cell] = {x: colIndex, y: rowIndex, orientation: HORIZONTAL, size: 1};
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
    seen.R.main = true;

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
      for (let i = 0; i < Math.abs(toX - x); ++i) {
        this.moveByOne(x, y, toX >= x ? 1 : -1);
      }
    } else if (piece.orientation == VERTICAL) {
      if (x != toX) {
        throw Error('stay in same lane vertical');
      }
      for (let i = 0; i < Math.abs(toY - y); ++i) {
        this.moveByOne(x, y, toY >= y ? 1 : -1);
      }
    }
  }
}

const CELL_SIZE = 100;

class Game {
  constructor(canvas, level) {
    this.canvas = canvas;
    this.level = level;

    this.onMouseUp();
  }

  draw() {
    let colors = [
      'green',
      'blue',
      'cyan',
      'yellow',
      'magenta',
      'pink',
      'orange',
      'brown',
    ];
    let nextColor = 0;

    let ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let piece of this.level.pieces) {
      let x = piece.x * CELL_SIZE;
      let y = piece.y * CELL_SIZE;
      let width = piece.orientation == VERTICAL ? CELL_SIZE : piece.size * CELL_SIZE;
      let height = piece.orientation == HORIZONTAL ? CELL_SIZE : piece.size * CELL_SIZE;

      ctx.fillStyle = piece.main ? 'red' : colors[nextColor++];
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      if (piece == this.selectedPiece) {
        ctx.lineWidth = 5;
      }
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }
  }

  toCanvasCoordinates(e) {
    let rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  onMouseDown(e) {
    let pos = this.toCanvasCoordinates(e);
    let x = Math.floor(pos.x / CELL_SIZE);
    let y = Math.floor(pos.y / CELL_SIZE);
    this.selectedPiece = this.level.pieceAt(x, y);
    this.draw();
  }

  onMouseUp(e) {
    this.selectedPiece = null;
    this.draw();
  }

  onMouseMove(e) {
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
  }
}

function startGame() {
  let canvas = document.getElementById('grid');
  if (!canvas.getContext) {
    return;
  }

  let level = Level.parse([
    'WWEEEB',
    '..F..B',
    'RRF..D',
    '..F..D',
    'XYY.Z.',
    'X...Z.',
  ].join('\n'))

  let game = new Game(canvas, level);

  game.draw(canvas);
  canvas.addEventListener('mousedown', game.onMouseDown.bind(game), false);
  canvas.addEventListener('mouseup', game.onMouseUp.bind(game), false);
  canvas.addEventListener('mousemove', game.onMouseMove.bind(game), false);
}
