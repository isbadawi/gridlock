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

  move(x, y, by) {
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
}

let level = Level.parse([
  'WWEEEB',
  '..F..B',
  'RRF..D',
  '..F..D',
  'XYY.Z.',
  'X...Z.',
].join('\n'))

console.log(level);
