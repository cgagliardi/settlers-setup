import { assert } from 'src/app/util/assert';
import { Board, CoordinatePairs, Coordinate, Hex, HexGrid, Port, ResourceType } from '../board';

export const STANDARD_SEAFARERS_BEACH_CONNECTIONS = [
  { x: 3, y: 0 },
  { x: 7, y: 0 },
  { x: 12, y: 0 },
  { x: 14, y: 3 },
  { x: 14, y: 5 },
  { x: 11, y: 7 },
  { x: 7, y: 7 },
  { x: 2, y: 7 },
  { x: 0, y: 4 },
  { x: 0, y: 2 },
] as Coordinate[];

/**
 * Example: createByCounts(['a', 3], ['b', 1]);
 * creates ['a', 'a', 'a', 'b'];
 * @param valueCounts A nested array of values followed by the amount of that value
 *     that should be in the queue.
 */
export function createByCounts<T>(...valueCounts: Array<[T, number]>): T[] {
  const vals = [];
  for (const [val, n] of valueCounts) {
    for (let i = 0; i < n; i++) {
      vals.push(val);
    }
  }
  return vals;
}

const AUTO_PORT_RESOURCES = [
  ResourceType.ANY,
  ResourceType.WHEAT,
  ResourceType.BRICK,
  ResourceType.SHEEP,
  ResourceType.ORE,
  ResourceType.WOOD,
  ResourceType.ANY,
] as ReadonlyArray<ResourceType>;

/**
 * Used when there are no default resource types on ports.
 * Coordinates are passed as CoordinatePairs to save on bytes.
 * coordinatePairs is in the form of
 * [port0-corner0Y, port0-corner0Y, port0-corner1Y, port0-corner1Y, port1-corner0Y, ...]
 */
export function generatePorts(coordinatePairs: CoordinatePairs): Port[] {
  assert(coordinatePairs.length % 4 === 0);
  let resourceCounter = 0;
  const ports = new Array(coordinatePairs.length / 4);
  for (let i = 0; i < coordinatePairs.length; i += 4) {
    const corner0 = {x: coordinatePairs[i + 0], y: coordinatePairs[i + 1]};
    const corner1 = {x: coordinatePairs[i + 2], y: coordinatePairs[i + 3]};
    ports[i / 4] = {
      resource: AUTO_PORT_RESOURCES[resourceCounter],
      corners: [corner0, corner1],
    };
    resourceCounter++;
    if (resourceCounter >= AUTO_PORT_RESOURCES.length) {
      resourceCounter = 0;
    }
  }
  return ports;
}

/**
 * Generates a standard hex-shaped settlers of catan board with the provided width and height.
 */
export function generateStandardShapedBoard(board: Board): HexGrid {
  return generateBoard(board, false /* isSeafarers */);
}

/**
 * Generates a seafarers hex-shaped settlers of catan board with the provided width and height.
 */
export function generateSeafarersBoard(board: Board): HexGrid {
  return generateBoard(board, true /* isSeafarers */);
}

function generateBoard(board: Board, isSeafarers: boolean): HexGrid {
  const hexes = new Array(board.dimensions.height);
  const middleRow = (board.dimensions.height - 1) / 2;
  for (let r = 0; r < board.dimensions.height; r++) {
    // Columns alternate in the array every other index.
    // See Default Board Layout at the top of this file.
    const distFromMiddle = Math.abs(r - middleRow);
    let startIndex;
    if (isSeafarers) {
      // On seafarers boards, the middle row is set 1 column in from the rows above/below.
      startIndex = distFromMiddle === 0 ? 1 : distFromMiddle - 1;
    } else {
      startIndex = distFromMiddle;
    }
    const hexesInRow = board.dimensions.width - startIndex;
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

export function inCoords(hex: Hex, coords: CoordinatePairs): boolean {
  for (let i = 0; i < coords.length; i += 2) {
    const x = coords[i];
    const y = coords[i + 1];
    if (hex.x === x && hex.y === y) {
      return true;
    }
  }
  return false;
}

/**
 * Used for boards like Seafarers #1 and The Desert Dragons where there's a main island that is
 * allowed desert pieces, and sub-islands that allow gold.
 * @param islandCoords The hex coordinates of sub-islands which allow gold but no deserts.
 * @param hex The hex is consideration.
 * @param resource The resource type in consideration.
 */
export function allowResourcesWithMainIslandRules(
    islandCoords: CoordinatePairs, hex: Hex, resource: ResourceType): boolean {
  if (resource !== ResourceType.GOLD && resource !== ResourceType.DESERT) {
    return true;
  }
  const hexOnIsland = inCoords(hex, islandCoords);
  if (resource === ResourceType.GOLD) {
    return hexOnIsland;
  } else { // desert
    return !hexOnIsland;
  }
}
