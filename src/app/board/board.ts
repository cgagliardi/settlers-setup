/**
 * @fileoverview This file defines the various enums, type definitions and interfaces needed to
 * define a Settlers board (BoardSpec). Additionaly, this file provides the Board class, which a
 * Strategy manipulates to fill a board and the UI reads to render the board.
 */
import { BoardShape } from './specs/shapes-enum';

export enum ResourceType {
  ANY = 'Any', // Used for 3:1 ports.
  BRICK = 'Brick',
  DESERT = 'Desert',
  GOLD = 'Gold',
  ORE = 'Ore',
  SHEEP = 'Sheep',
  WATER = 'Water',
  WOOD = 'Wood',
  WHEAT = 'Wheat',
}

export const ROLL_NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12] as ReadonlyArray<number>;

export const STANDARD_RESOURCES = [
  ResourceType.BRICK,
  ResourceType.ORE,
  ResourceType.SHEEP,
  ResourceType.WOOD,
  ResourceType.WHEAT,
] as ReadonlyArray<ResourceType>;

export type HexGrid = Array<Array<Hex|undefined>>;
export type CornerGrid = Array<Array<Corner|undefined>>;
// This is a more compact version of coordinate for use in board specs.
// The arrays should always be even in length where values are [x0, y0, x1, y1, ...]
export type CoordinatePairs = ReadonlyArray<number>;

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

export interface Coordinate {
  readonly x: number;
  readonly y: number;
}

function serializeCoordinate(x: number, y: number): string {
  return x + '-' + y;
}

export interface Port {
  // Initialized with the default resource type for that port.
  resource: ResourceType;
  readonly corners: [Coordinate, Coordinate];
}

export interface Beach {
  // The connection numbers that appear on the sides of the beach piece. In order from left-to-right
  // if down is the beach. The first number is the female connector.
  labels?: [number, number];
  // coordinates are in clockwise order.
  corners: Coordinate[];
}

/**
 * Given the number of a roll, returns the number of dots that appear on that roll number.
 * The probability of the roll is this value / 36.
 */
export function getNumDots(rollNumber: number): number {
  if (rollNumber < 7) {
    return rollNumber - 1;
  } else {
    return 13 - rollNumber;
  }
}

export interface BeachConnection {
  x: number;
  y: number;
  label?: number;
}

/**
 * BoardSpec defines a specific settlers of catan board such that a setup strategy can be built from
 * it.
 *
 * The indexes of the HexGrid 2d array are demonstrated below.
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
export interface BoardSpec {
  readonly shape: BoardShape;
  // The maximum x and height of the board. Where width and height are defined by a single hex
  // being size 1. This translates to:
  // { height: hexes.length, width: (maxHexesCol.length+1)/2}
  readonly dimensions: Dimensions;
  // Returns a list of resources where resources.length equals the number of !undefined values in
  // hexes.
  readonly resources: () => ResourceType[];
  // Returns a list of rollNumbers where rollNumbers.length equals resources.length - the number of
  // desert resources.
  readonly rollNumbers: () => number[];
  // Passed in the value of BoardSpec.dimensions.
  // Returns a 2d array where populated columns alternate between each row as described by the board
  // layout examples in the top of this file.
  readonly hexes: (board: Board) => HexGrid;
  // Initialize resources on hexes that must always be set. Resources set here should not be
  // included in resources().
  readonly requiredResources: ReadonlyArray<[ResourceType, CoordinatePairs]>;
  readonly isResourceAllowed: (hex: Hex, resource: ResourceType) => boolean;
  readonly centerCoords: ReadonlyArray<Coordinate>;
  readonly beachConnections: ReadonlyArray<BeachConnection>;
  readonly ports: () => Port[];
  // Corner coordinates where dragons lie.
  readonly dragons?: CoordinatePairs;
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
  notes = '';

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
  rollNumber: number|null = null;
  score: number|null = null;
  // Cached values.
  private typedPortResources: Set<ResourceType>|undefined;
  private neighbors: Hex[]|undefined;
  private corners: Corner[]|undefined;

  /**
   * @param x x-coordinate in hexes as described in the file comments.
   * @param y y-coordinate in hexes as described in the file comments.
   * @param hexes The entire board. This is used so that we can provide neighbors.
   */
  constructor(
      readonly x: number,
      readonly y: number,
      private readonly board: Board) {}

  reset() {
    this.resource = null;
    this.rollNumber = null;
    this.score = null;
    this.typedPortResources = undefined;
  }

  /**
   * All neighboring hexes on the board.
   */
  getNeighbors(): Hex[] {
    if (!this.neighbors) {
      this.neighbors = [
        this.board.getHex(this.x - 2, this.y),
        this.board.getHex(this.x + 2, this.y),
        this.board.getHex(this.x - 1, this.y - 1),
        this.board.getHex(this.x + 1, this.y - 1),
        this.board.getHex(this.x - 1, this.y + 1),
        this.board.getHex(this.x + 1, this.y + 1),
      ].filter(n => n);
    }
    return this.neighbors;
  }

  getCorners(): Corner[] {
    if (!this.corners) {
      this.corners = [
        this.board.getCorner(this.x, this.y),
        this.board.getCorner(this.x + 1, this.y),
        this.board.getCorner(this.x + 2, this.y),
        this.board.getCorner(this.x, this.y + 1),
        this.board.getCorner(this.x + 1, this.y + 1),
        this.board.getCorner(this.x + 2, this.y + 1),
      ];
    }
    return this.corners;
  }

  /**
   * Note: this function is lazy-cached, so if it's called before the board is initialized, it will
   * always return an incorrect value.
   * @returns The ResourceTypes of the neighboring ports with "ANY" removed from the results.
   */
  getTypedPortResources(): Set<ResourceType>|null {
    if (this.typedPortResources === undefined) {
      const resources = this.getCorners()
          .filter(c => !!c.port && c.port.resource !== ResourceType.ANY)
          .map(c => c.port.resource);
      this.typedPortResources = new Set(resources);
    }
    return this.typedPortResources;
  }

  /**
   * @returns The resource types of the neighboring hexes.
   */
  getNeighborResources(): ResourceType[] {
    return this.getNeighbors().map(h => h.resource).map(r => r).filter(r => r);
  }

  hasCoordinate(coord: Coordinate): boolean {
    return coord.x === this.x && coord.y === this.y;
  }
}


export class Board {
  readonly shape: BoardShape;
  // So the BoardSpec for a description of what this value actually means.
  readonly dimensions: Dimensions;
  // Hexes represents all of the resource hexes on the board, where the indexes
  // are what's documented in the Default Board Layout at the top of this file.
  readonly hexGrid: HexGrid;
  readonly cornerGrid: CornerGrid;
  readonly ports: ReadonlyArray<Port>;
  // Cached value for get hexes.
  private flatHexes: ReadonlyArray<Hex>;
  // Cached value fro get mutableHexes.
  private cachedMutableHexes: ReadonlyArray<Hex>;
  private cachedBeaches: ReadonlyArray<Beach>;
  // Cached value for get corners.
  private flatCorners: ReadonlyArray<Corner>;
  // Coordinates are serialized using serializeCoordinate().
  private requiredResourceCoordinates: Set<string>;

  constructor(public readonly spec: BoardSpec) {
    this.shape = spec.shape;
    this.dimensions = spec.dimensions;
    this.hexGrid = spec.hexes(this);

    this.requiredResourceCoordinates = new Set();
    for (const [resourceType, coordinatePairs] of spec.requiredResources) {
      for (let i = 0; i < coordinatePairs.length; i += 2) {
        this.requiredResourceCoordinates.add(
            serializeCoordinate(coordinatePairs[i], coordinatePairs[i + 1]));
      }
    }
    this.setRequiredResources();

    this.ports = spec.ports() as ReadonlyArray<Port>;
    this.cornerGrid = this.generateCornerGrid();
  }

  private generateCornerGrid(): CornerGrid {
    const corners = new Array<Array<Corner|undefined>>(this.hexGrid.length + 1);

    for (let y = 0; y < corners.length; y++) {
      const [row1, row2] = this.getHexRowsForCornerRow(y);
      const numHexCols = row2 ? Math.max(row1.length, row2.length) : row1.length;
      const rowLen = numHexCols + 1;
      // The first index in hexes is also the first index in the corners column.
      const firstCol = findFirstSetIndex(row1, row2);
      corners[y] = new Array(rowLen);
      for (let x = firstCol; x < rowLen; x++) {
        const port =
            this.ports.find(p => p.corners.find(c => c.x === x && c.y === y)) || null;
        corners[y][x] = new Corner(x, y, port, this);
      }
    }
    return corners;
  }

  reset() {
    for (const hex of this.hexes) {
      hex.reset();
    }
    this.setRequiredResources();
  }

  private setRequiredResources(): void {
    for (const [resourceType, coordinatePairs] of this.spec.requiredResources) {
      for (let i = 0; i < coordinatePairs.length; i += 2) {
        const x = coordinatePairs[i];
        const y = coordinatePairs[i + 1];
        this.getHex(x, y).resource = resourceType;
      }
    }
  }

  get hexes(): ReadonlyArray<Hex> {
    if (!this.flatHexes) {
      this.flatHexes = flatten2dArray(this.hexGrid) as ReadonlyArray<Hex>;
    }
    return this.flatHexes;
  }

  get mutableHexes(): ReadonlyArray<Hex> {
    if (!this.cachedMutableHexes) {
      this.cachedMutableHexes = this.hexes.filter(hex => !this.isResourceImmutable(hex));
    }
    return this.cachedMutableHexes;
  }

  get centerHexes(): ReadonlyArray<Hex> {
    return this.spec.centerCoords.map(coord => this.getHex(coord.x, coord.y));
  }

  get corners(): ReadonlyArray<Corner> {
    if (!this.flatCorners) {
      this.flatCorners = flatten2dArray(this.cornerGrid) as ReadonlyArray<Corner>;
    }
    return this.flatCorners;
  }

  get beaches(): ReadonlyArray<Beach> {
    if (!this.cachedBeaches) {
      const connections = this.spec.beachConnections;
      if (connections.length === 0) {
        this.cachedBeaches = [];
      } else {
        const beaches = new Array<Beach>();
        try {
          beaches.push(
              this.createBeachFromConnections(connections[connections.length - 1], connections[0]));
        } catch (e) {
          console.error(e);
        }
        for (let i = 0; i < connections.length - 1; i++) {
          try {
            beaches.push(this.createBeachFromConnections(connections[i], connections[i + 1]));
          } catch (e) {
            console.error(e);
          }
        }
        this.cachedBeaches = beaches;
      }
    }
    return this.cachedBeaches;
  }

  createBeachFromConnections(from: BeachConnection, to: BeachConnection): Beach {
    const beach = {
      corners: this.calculateBeachCorners(from, to)
    } as Beach;
    if (from.label && to.label) {
      beach.labels = [from.label, to.label];
    }
    return beach;
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

  /**
   * @returns True if the hex is permitted to have the resource based on the type of game.
   */
  isResourceAllowed(hex: Hex, resource: ResourceType): boolean {
    return this.spec.isResourceAllowed(hex, resource);
  }

  isResourceImmutable(hex: Hex): boolean {
    return this.requiredResourceCoordinates.has(serializeCoordinate(hex.x, hex.y));
  }

  /**
   * Given the start and end coordinates that are beach corners, returns a list of all beach
   * coordinates from start to end inclusive.
   * This only works when start/end are along a straight line on the board.
   * Used to render the beaches of the board.
   */
  private calculateBeachCorners(from: Coordinate, to: Coordinate): Coordinate[] {
    // This works by determining the x and y direction between from and to. Then it walks along
    // the board incrementing towards that direction and seeing if any such increment is a beach
    // corner. Because incrementing only x or y or both could be the next correct beach, it tries
    // all 3 combinations.
    // Appologies to those who have spent more time studying graph theory. This is just what I came
    // up with and it works for this limited problem set.
    const xDirection = to.x - from.x > 0 ? 1 : -1;
    const yDirection = from.y === to.y ? 0 : (to.y - from.y > 0 ? 1 : -1);

    const coords = [from];

    const tryBeachCorner = (coord: Coordinate) => {
      if (this.isBeachCorner(coord)) {
        coords.push(coord);
        prevCoord = coord;
        return true;
      }
      return false;
    };

    let prevCoord = from;
    while (prevCoord.x !== to.x || prevCoord.y !== to.y) {
      const tryXFirst = yDirection === 0 || prevCoord.x % 2 === 1;
      if (tryXFirst && tryBeachCorner({x: prevCoord.x + xDirection, y: prevCoord.y})) {
        continue;
      }
      if (yDirection !== 0) {
        if (tryBeachCorner({x: prevCoord.x, y: prevCoord.y + yDirection})) {
          continue;
        }
        if (!tryXFirst && tryBeachCorner({x: prevCoord.x + xDirection, y: prevCoord.y})) {
          continue;
        }
        if (tryBeachCorner({x: prevCoord.x + xDirection, y: prevCoord.y + yDirection})) {
          continue;
        }
      }
      throw new Error('Cannot find next coastal coordinate for beach.');
    }
    return coords;
  }

  /**
   * @returns True if the corner at coord is at the edge of the board.
   */
  isBeachCorner(coord: Coordinate): boolean {
    const corner = this.getCorner(coord.x, coord.y);
    if (!corner) {
      return false;
    }
    return corner.getHexes().length <= 2;
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
  for (const row of grid) {
    for (const cell of row) {
      if (cell) {
        arr.push(cell);
      }
    }
  }
  return arr;
}
