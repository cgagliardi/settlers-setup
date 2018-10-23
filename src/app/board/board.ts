import { RandomQueue } from './random-queue';

/*
 * Default Board Layout
 *    012345678
 * 0    2 4 6
 * 1   1 3 5 7
 * 2  0 2 4 6 8
 * 3   1 3 5 7
 * 4    2 4 6
 *
 * Expansion 5-6 Board Layout
 *    01234567890
 * 0     3 5 7
 * 1    2 4 6 8
 * 2   1 3 5 7 9
 * 3  0 2 4 6 8 0
 * 4   1 3 5 7 9
 * 5    2 4 6 8
 * 6     3 5 7
 *
 * Where the above represents coordinates. Since coordinates are single digit, they will be written
 * as 2 numbers XY. The top left piece being 20. Corners of pieces are represented as NW, N, NE, SE,
 * S, SW.  A specific corner is written as 02NW.
 *
 * The perimeter number indicators (that tell you how to put the board together)
 * are as follows:
 * #1: 20NW
 * #2: 60N
 * #3: 82NE
 * #4: 64SE
 * #5: 24S
 * #6: 02SW
 *
 * The default ports are as follows:
 * ? - 40NW, 40N
 * ? - 60N, 60NE
 * Brick - 71NE, 71SE
 * Wood - 73NE, 73SE
 * ? - 64SE, 64S
 * Wheat - 44S, 44SW
 * Ore - 13S, 13SW
 * ? - 02SW, 02NW
 * Sheep - 11NW, 11N
 */

export enum ResourceType {
  ANY, // Used for 3:1 ports.
  BRICK,
  DESERT,
  ORE,
  SHEEP,
  WOOD,
  WHEAT,
}

export type BoardHexes = Array<Array<Hex|undefined>>;
export type BoardCorners = Array<Array<Corner|undefined>>;

export interface Dimensions {
  width: number;
  height: number;
}

export interface BoardSpec {
  // A human readable name for this board layout.
  readonly label: string;
  // The maximum width and height of the board. Where width and height are defined by a single hex
  // being size 1. This translates to:
  // { height: hexes.length, width: (maxHexesCol.length+1)/2}
  readonly dimensions: Dimensions;
  // Returns a queue of resources where resources.length equals the number of !undefined values in
  // hexes.
  readonly resources: () => RandomQueue<ResourceType>;
  // Passed in the value of BoardSpec.dimensions.
  // Returns a 2d array where populated columns alternate between each row as described by the board
  // layout examples in the top of this file.
  readonly hexes: (board: Board) => BoardHexes;
}

export enum BoardShape {
  STANDARD = 'Standard',
  EXPANSION6 = '5-6 Player Expansion',
}

export const BOARD_SPECS: { readonly [index: string]: BoardSpec } = {
  [BoardShape.STANDARD]: {
    label: BoardShape.STANDARD,
    dimensions: {width: 5, height: 5},
    resources: () => RandomQueue.createByCounts(
        [ResourceType.BRICK, 3],
        [ResourceType.DESERT, 1],
        [ResourceType.ORE, 3],
        [ResourceType.SHEEP, 4],
        [ResourceType.WOOD, 4],
        [ResourceType.WHEAT, 4],
    ),
    hexes: (board) => generateStandardShapedBoard(board),
  },
  [BoardShape.EXPANSION6]: {
    label: BoardShape.EXPANSION6,
    dimensions: {width: 6, height: 7},
    resources: () => RandomQueue.createByCounts(
        [ResourceType.BRICK, 5],
        [ResourceType.DESERT, 2],
        [ResourceType.ORE, 5],
        [ResourceType.SHEEP, 6],
        [ResourceType.WOOD, 6],
        [ResourceType.WHEAT, 6],
    ),
    hexes: (board) => generateStandardShapedBoard(board),
  }
};

/**
 * A corner represents the intersection of hexes and the catan beach.
 * The coordinates are represented on a separate system from the hex coordinates.
 * For a Catan board that has only a single hex, the corner coordinates for that board are as
 * follows:
 * NW: 0,0
 * N:  1,0
 * NE: 2,0
 * SW: 0,1
 * S:  1,1
 * SE: 2,1
 *
 * Although in the real world, the N corner is higher than NW and NE, here we collapse them into a
 * single row.
 *
 * Unlike the Hexes, we have no gaps in numbers in the corner coordinate system
 */
export class Corner {
  score: number|null = null;
  port: ResourceType|null = null;

  constructor(
      readonly x: number,
      readonly y: number,
      private readonly board: Board) {}

  /**
   * @returns Hexes that touch the corner. Returns at most 3 values.
   */
  getHexes(): Hex[] {
    // Hex rows at are [y, y-1]
    // For columns, use [x-2, x-1, x]
    // We'll never actually return 6 values, since hex values alternate on columns.
    return [
      this.board.getHex(this.x - 2, this.y - 1),
      this.board.getHex(this.x - 1, this.y - 1),
      this.board.getHex(this.x, this.y - 1),
      this.board.getHex(this.x - 2, this.y),
      this.board.getHex(this.x - 1, this.y),
      this.board.getHex(this.x, this.y),
    ].filter(n => n);
  }
}


export class Hex {
  resource: ResourceType|null = null;

  /**
   * @param x x-coordinate in hexes as described in the file comments.
   * @param y y-coordinate in hexes as described in the file comments.
   * @param hexes The entire board. This is used so that we can provide neighbors.
   */
  constructor(
      readonly x: number,
      readonly y: number,
      private readonly board: Board) {}

  /**
   * All neighboring hexes on the board.
   */
  getNeighbors(): Hex[] {
    return [
      this.board.getHex(this.x - 2, this.y),
      this.board.getHex(this.x + 2, this.y),
      this.board.getHex(this.x - 1, this.y - 1),
      this.board.getHex(this.x + 1, this.y - 1),
      this.board.getHex(this.x - 1, this.y + 1),
      this.board.getHex(this.x + 1, this.y + 1),
    ].filter(n => n);
  }

  getCorners(): Corner[] {
    return [
      this.board.getCorner(this.x, this.y),
      this.board.getCorner(this.x + 1, this.y),
      this.board.getCorner(this.x + 2, this.y),
      this.board.getCorner(this.x, this.y + 1),
      this.board.getCorner(this.x + 1, this.y + 1),
      this.board.getCorner(this.x + 2, this.y + 1),
    ];
  }
}


export class Board {
  readonly label: string;
  // So the BoardSpec for a description of what this value actually means.
  readonly dimensions: Dimensions;
  // Hexes represents all of the resource hexes on the board, where the indexes
  // are what's documented in the Default Board Layout at the top of this file.
  readonly hexes: BoardHexes;
  readonly corners: BoardCorners;
  readonly remainingResources:  RandomQueue<ResourceType>;
  // Cached value for getAllHexes.
  private flatHexes: Hex[];

  constructor(spec: BoardSpec) {
    this.label = spec.label;
    this.dimensions = spec.dimensions;
    this.hexes = spec.hexes(this);
    this.remainingResources = spec.resources();
    this.corners = this.generateCorners();
  }

  private generateCorners(): BoardCorners {
    const corners = new Array<Array<Corner|undefined>>(this.hexes.length + 1);

    for (let r = 0; r < this.hexes.length; r++) {
      const [row1, row2] = this.getHexRowsForCornerRow(r);
      const numHexCols = row2 ? Math.max(row1.length, row2.length) : row1.length;
      const rowLen = numHexCols + 2;
      // The first index in hexes is also the first index in the corners column.
      const firstCol = findFirstSetIndex(row1, row2);
      corners[r] = new Array(rowLen);
      for (let c = firstCol; c < rowLen; c++) {
        corners[r][c] = new Corner(r, c, this);
      }
    }
    return corners;
  }

  getAllHexes(): ReadonlyArray<Hex> {
    if (!this.flatHexes) {
      this.flatHexes = [];
      for (let r = 0; r < this.hexes.length; r++) {
        for (let c = 0; c < this.hexes[r].length; c++) {
          if (this.hexes[r][c]) {
            this.flatHexes.push(this.hexes[r][c]);
          }
        }
      }
    }
    return this.flatHexes as ReadonlyArray<Hex>;
  }

  getHex(c: number, r: number): Hex|undefined {
    return getFrom2dArray(this.hexes, c, r);
  }

  getCorner(c: number, r: number): Corner|undefined {
    return getFrom2dArray(this.corners, c, r);
  }

  /**
   * @param r An index in this.corners.
   * @returns The rows in hexes that are associated with the given row in this.corners[r].
   */
  private getHexRowsForCornerRow(r: number): BoardHexes {
    if (r === 0) {
      return [this.hexes[0]];
    } else if (r === this.hexes.length) {
      return [this.hexes[this.hexes.length - 1]];
    } else {
      return [this.hexes[r - 1], this.hexes[r]];
    }
  }
}

/**
 * Generates a standard hex-shaped settlers of catan board with the provided width and height.
 * While this function is helpful for the standard and 5-6 expansion boards, it will not be useful
 * for something like a seafarers board.
 */
function generateStandardShapedBoard(board: Board) {
  const hexes = new Array(board.dimensions.height);
  const middleRow = (board.dimensions.height - 1) / 2;
  for (let r = 0; r < board.dimensions.height; r++) {
    // Columns alternate in the array every other index.
    // See Default Board Layout at the top of this file.
    const distFromMiddle = Math.abs(r - middleRow);
    const hexesInRow = board.dimensions.width - distFromMiddle;
    const startIndex = distFromMiddle;
    const maxCols = startIndex + hexesInRow * 2;
    hexes[r] = new Array(maxCols);
    for (let c = startIndex; c < maxCols; c++) {
      if ((startIndex - c) % 2 === 0) {
        hexes[r][c] = new Hex(c, r, board);
      }
    }
  }
  return hexes;
}

/**
 * Given 2 arrays (or maybe just 1), return the index of the first defined value in either array.
 * Returns -1 if no such value exists.
 */
function findFirstSetIndex(arr1: Array<any>, arr2: Array<any>|undefined): number {
  const isSet = v => v !== undefined;
  const index1 = arr1.findIndex(isSet);
  if (!arr2) {
    return index1;
  }
  const index2 = arr2.findIndex(isSet);
  if (index1 === -1) {
    return index2;
  }
  if (index2 === -1) {
    return index1;
  }
  return Math.min(index1, index2);
}

function getFrom2dArray<T>(arr: Array<Array<T>>, c: number, r: number): T|undefined {
  if (r < 0 || r >= arr.length) {
    return undefined;
  }
  return arr[r][c];
}
