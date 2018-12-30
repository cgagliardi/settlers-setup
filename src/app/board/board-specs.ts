/**
 * @fileoverview Contains the specification for each supported Catan board.
 */

import { BoardSpec, Board, Hex, ResourceType } from './board';
import { RandomQueue } from './random-queue';

export enum BoardShape {
  STANDARD = 'Standard',
  EXPANSION6 = '5-6 Player Expansion',
}

/**
   * Example: createByCounts(['a', 3], ['b', 1]);
   * creates ['a', 'a', 'a', 'b'];
   * @param valueCounts A nested array of values followed by the amount of that value
   *     that should be in the queue.
   */
function createByCounts<T>(...valueCounts: Array<[T, number]>): T[] {
  const vals = [];
  for (const [val, n] of valueCounts) {
    for (let i = 0; i < n; i++) {
      vals.push(val);
    }
  }
  return vals;
}

export const BOARD_SPECS: { readonly [index: string]: BoardSpec } = {
  [BoardShape.STANDARD]: {
    shape: BoardShape.STANDARD,
    dimensions: {width: 5, height: 5},
    resources: () => createByCounts(
        [ResourceType.BRICK, 3],
        [ResourceType.DESERT, 1],
        [ResourceType.ORE, 3],
        [ResourceType.SHEEP, 4],
        [ResourceType.WOOD, 4],
        [ResourceType.WHEAT, 4],
    ),
    hexes: (board) => generateStandardShapedBoard(board),
    beaches: () => [
      {
        connections: [6, 1],
        // TODO - If I can figure out how to walk around the perimeter of the board, I should be
        // able to automate this list with just start and end points.
        corners: [
          {x: 2, y: 0},
          {x: 3, y: 0},
          {x: 4, y: 0},
          {x: 5, y: 0},
          {x: 6, y: 0},
          {x: 7, y: 0},
        ],
        ports: [{
          resource: ResourceType.ANY,
          corners: [{x: 2, y: 0}, {x: 3, y: 0}],
        }, {
          resource: ResourceType.SHEEP,
          corners: [{x: 5, y: 0}, {x: 6, y: 0}],
        }],
      },
      {
        connections: [1, 2],
        corners: [
          {x: 7, y: 0},
          {x: 8, y: 0},
          {x: 8, y: 1},
          {x: 9, y: 1},
          {x: 9, y: 2},
          {x: 10, y: 2},
        ],
        ports: [{
          resource: ResourceType.ANY,
          corners: [{x: 8, y: 1}, {x: 9, y: 1}],
        }]
      },
      {
        connections: [2, 3],
        corners: [
          {x: 10, y: 2},
          {x: 10, y: 3},
          {x: 9, y: 3},
          {x: 9, y: 4},
          {x: 8, y: 4},
          {x: 8, y: 5}
        ],
        ports: [{
          resource: ResourceType.ANY,
          corners: [{x: 10, y: 2}, {x: 10, y: 3}],
        }, {
          resource: ResourceType.BRICK,
          corners: [{x: 9, y: 4}, {x: 8, y: 4}],
        }],
      },
      {
        connections: [3, 4],
        corners: [
          {x: 8, y: 5},
          {x: 7, y: 5},
          {x: 6, y: 5},
          {x: 5, y: 5},
          {x: 4, y: 5},
          {x: 3, y: 5},
        ],
        ports: [{
          resource: ResourceType.WOOD,
          corners: [{x: 6, y: 5}, {x: 5, y: 5}],
        }],
      },
      {
        connections: [4, 5],
        corners: [
          {x: 3, y: 5},
          {x: 2, y: 5},
          {x: 2, y: 4},
          {x: 1, y: 4},
          {x: 1, y: 3},
          {x: 0, y: 3},
        ],
        ports: [{
          resource: ResourceType.ANY,
          corners: [{x: 3, y: 5}, {x: 2, y: 5}],
        }, {
          resource: ResourceType.WHEAT,
          corners: [{x: 1, y: 4}, {x: 1, y: 3}],
        }],
      },
      {
        connections: [5, 6],
        corners: [
          {x: 0, y: 3},
          {x: 0, y: 2},
          {x: 1, y: 2},
          {x: 1, y: 1},
          {x: 2, y: 1},
          {x: 2, y: 0},
        ],
        ports: [{
          resource: ResourceType.ORE,
          corners: [{x: 1, y: 2}, {x: 1, y: 1}],
        }],
      }
    ],
    rollNumbers: () => [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
  },
  [BoardShape.EXPANSION6]: {
    shape: BoardShape.EXPANSION6,
    dimensions: {width: 6, height: 7},
    resources: () => createByCounts(
        [ResourceType.BRICK, 5],
        [ResourceType.DESERT, 2],
        [ResourceType.ORE, 5],
        [ResourceType.SHEEP, 6],
        [ResourceType.WOOD, 6],
        [ResourceType.WHEAT, 6],
    ),
    hexes: (board) => generateStandardShapedBoard(board),
    beaches: () => [
      {
        connections: [6, 1],
        corners: [
          {x: 3, y: 0},
          {x: 4, y: 0},
          {x: 5, y: 0},
          {x: 6, y: 0},
          {x: 7, y: 0},
          {x: 8, y: 0},
        ],
        ports: [{
          resource: ResourceType.ANY,
          corners: [{x: 3, y: 0}, {x: 4, y: 0}],
        }, {
          resource: ResourceType.SHEEP,
          corners: [{x: 6, y: 0}, {x: 7, y: 0}],
        }],
      },
      {
        connections: [1, 2],
        corners: [
          {x: 8, y: 0},
          {x: 9, y: 0},
          {x: 9, y: 1},
          {x: 10, y: 1},
          {x: 10, y: 2},
          {x: 11, y: 2},
          {x: 11, y: 3},
          {x: 12, y: 3},
        ],
        ports: [{
          resource: ResourceType.ANY,
          corners: [{x: 9, y: 1}, {x: 10, y: 1}],
        }],
      },
      {
        connections: [2, 3],
        corners: [
          {x: 12, y: 3},
          {x: 12, y: 4},
          {x: 11, y: 4},
          {x: 11, y: 5},
          {x: 10, y: 5},
          {x: 10, y: 6},
          {x: 9, y: 6},
          {x: 9, y: 7},
        ],
        ports: [{
          resource: ResourceType.ANY,
          corners: [{x: 12, y: 3}, {x: 12, y: 4}],
        },
        {
          resource: ResourceType.BRICK,
          corners: [{x: 11, y: 5}, {x: 10, y: 5}],
        },
        {
          resource: ResourceType.SHEEP,
          corners: [{x: 9, y: 6}, {x: 9, y: 7}],
        }],
      },
      {
        connections: [3, 4],
        corners: [
          {x: 9, y: 7},
          {x: 8, y: 7},
          {x: 7, y: 7},
          {x: 6, y: 7},
          {x: 5, y: 7},
          {x: 4, y: 7},
        ],
        ports: [{
          resource: ResourceType.WOOD,
          corners: [{x: 7, y: 7}, {x: 6, y: 7}],
        }],
      },
      {
        connections: [4, 5],
        corners: [
          {x: 4, y: 7},
          {x: 3, y: 7},
          {x: 3, y: 6},
          {x: 2, y: 6},
          {x: 2, y: 5},
          {x: 1, y: 5},
          {x: 1, y: 4},
          {x: 0, y: 4},
        ],
        ports: [{
          resource: ResourceType.ANY,
          corners: [{x: 4, y: 7}, {x: 3, y: 7}],
        },
        {
          resource: ResourceType.WHEAT,
          corners: [{x: 2, y: 6}, {x: 2, y: 5}],
        },
        {
          resource: ResourceType.ANY,
          corners: [{x: 1, y: 4}, {x: 0, y: 4}],
        }],
      },
      {
        connections: [5, 6],
        corners: [
          {x: 0, y: 4},
          {x: 0, y: 3},
          {x: 1, y: 3},
          {x: 1, y: 2},
          {x: 2, y: 2},
          {x: 2, y: 1},
          {x: 3, y: 1},
          {x: 3, y: 0},
        ],
        ports: [{
          resource: ResourceType.ORE,
          corners: [{x: 1, y: 3}, {x: 1, y: 2}],
        }],
      },
    ],
    rollNumbers: () => createByCounts(
      [2, 2],
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
      [8, 3],
      [9, 3],
      [10, 3],
      [11, 3],
      [11, 2],
    ),
  }
};

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
