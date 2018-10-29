import { RandomQueue } from './random-queue';

/**
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
 */

export enum ResourceType {
  ANY = 'Any', // Used for 3:1 ports.
  BRICK = 'Brick',
  DESERT = 'Desert',
  ORE = 'Ore',
  SHEEP = 'Sheep',
  WOOD = 'Wood',
  WHEAT = 'Wheat',
}

export type HexGrid = Array<Array<Hex|undefined>>;
export type CornerGrid = Array<Array<Corner|undefined>>;

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

export interface Coordinate {
  readonly x: number;
  readonly y: number;
}

export interface Port {
  // Initialized with the default resource type for that port.
  resource: ResourceType;
  readonly corners: [Coordinate, Coordinate];
}

export interface Beach {
  // The connection numbers that appear on the sides of the beach piece. In order from left-to-right
  // if down is the beach. The first number is the female connector.
  connections: [number, number];
  // Coordinates of every corner the beach touches where the first entry corresponds to
  // connections[0] and vice-versa.
  corners: Coordinate[];
  ports: Port[];
}

export interface BoardSpec {
  // A human readable name for this board layout.
  readonly label: string;
  // The maximum x and height of the board. Where width and height are defined by a single hex
  // being size 1. This translates to:
  // { height: hexes.length, width: (maxHexesCol.length+1)/2}
  readonly dimensions: Dimensions;
  // Returns a queue of resources where resources.length equals the number of !undefined values in
  // hexes.
  readonly resources: () => RandomQueue<ResourceType>;
  // Passed in the value of BoardSpec.dimensions.
  // Returns a 2d array where populated columns alternate between each row as described by the board
  // layout examples in the top of this file.
  readonly hexes: (board: Board) => HexGrid;
  readonly beaches: () => Beach[];
}

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

  constructor(
      readonly x: number,
      readonly y: number,
      readonly port: Port|null,
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
  readonly hexGrid: HexGrid;
  readonly cornerGrid: CornerGrid;
  readonly remainingResources:  RandomQueue<ResourceType>;
  readonly beaches: ReadonlyArray<Beach>;
  // Cached value for get hexes.
  private flatHexes: ReadonlyArray<Hex>;
  // Cached value for get corners.
  private flatCorners: ReadonlyArray<Corner>;

  constructor(spec: BoardSpec) {
    this.label = spec.label;
    this.dimensions = spec.dimensions;
    this.hexGrid = spec.hexes(this);
    this.remainingResources = spec.resources();
    this.beaches = spec.beaches() as ReadonlyArray<Beach>;
    this.cornerGrid = this.generateCornerGrid();
  }

  private generateCornerGrid(): CornerGrid {
    const corners = new Array<Array<Corner|undefined>>(this.hexGrid.length + 1);

    const allPorts = this.beaches.reduce((arr, beach) => arr.concat(beach.ports), []);

    for (let y = 0; y < corners.length; y++) {
      const [row1, row2] = this.getHexRowsForCornerRow(y);
      const numHexCols = row2 ? Math.max(row1.length, row2.length) : row1.length;
      const rowLen = numHexCols + 1;
      // The first index in hexes is also the first index in the corners column.
      const firstCol = findFirstSetIndex(row1, row2);
      corners[y] = new Array(rowLen);
      for (let x = firstCol; x < rowLen; x++) {
        const port =
            allPorts.find(p => p.corners.find(c => c.x === x && c.y === y)) || null;
        corners[y][x] = new Corner(x, y, port, this);
      }
    }
    return corners;
  }

  get hexes(): ReadonlyArray<Hex> {
    if (!this.flatHexes) {
      this.flatHexes = flatten2dArray(this.hexGrid) as ReadonlyArray<Hex>;
    }
    return this.flatHexes;
  }

  get corners(): ReadonlyArray<Corner> {
    if (!this.flatCorners) {
      this.flatCorners = flatten2dArray(this.cornerGrid) as ReadonlyArray<Corner>;
    }
    return this.flatCorners;
  }

  getHex(x: number, y: number): Hex|undefined {
    return getFrom2dArray(this.hexGrid, x, y);
  }

  getCorner(x: number, y: number): Corner|undefined {
    return getFrom2dArray(this.cornerGrid, x, y);
  }

  /**
   * @param r An index in this.cornerGrid.
   * @returns The rows in hexes that are associated with the given row in this.cornerGrid[r].
   */
  private getHexRowsForCornerRow(r: number): HexGrid {
    if (r === 0) {
      return [this.hexGrid[0]];
    } else if (r === this.hexGrid.length) {
      return [this.hexGrid[this.hexGrid.length - 1]];
    } else {
      return [this.hexGrid[r - 1], this.hexGrid[r]];
    }
  }
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

function getFrom2dArray<T>(arr: Array<Array<T>>, x: number, y: number): T|undefined {
  if (y < 0 || y >= arr.length) {
    return undefined;
  }
  return arr[y][x];
}

/**
 * Given a partially filled 2d array, returns a flat list of all truthy values.
 */
function flatten2dArray<T>(grid: Array<Array<T|undefined>>): T[] {
  const arr = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c]) {
        arr.push(grid[r][c]);
      }
    }
  }
  return arr;
}
