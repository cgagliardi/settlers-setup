/**
 * @fileoverview Contains the specification for each supported Catan board.
 */

import { BoardSpec, Board, Hex, ResourceType } from './board';
import { RandomQueue } from './random-queue';

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
    beaches: () => [
      {
        connections: [6, 1],
        corners: [{x: 2, y: 0}, {x: 8, y: 0}],
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
        corners: [{x: 8, y: 0}, {x: 10, y: 2}],
        ports: [{
          resource: ResourceType.ANY,
          corners: [{x: 8, y: 1}, {x: 9, y: 1}],
        }]
      },
      {
        connections: [2, 3],
        corners: [{x: 10, y: 2}, {x: 8, y: 5}],
        ports: [{
          resource: ResourceType.ANY,
          corners: [{x: 10, y: 2}, {x: 10, y: 3}],
        }, {
          resource: ResourceType.BRICK,
          corners: [{x: 8, y: 4}, {x: 9, y: 4}],
        }],
      },
      {
        connections: [3, 4],
        corners: [{x: 8, y: 5}, {x: 3, y: 5}],
        ports: [{
          resource: ResourceType.WOOD,
          corners: [{x: 5, y: 5}, {x: 6, y: 5}],
        }],
      },
      {
        connections: [4, 5],
        corners: [{x: 3, y: 5}, {x: 0, y: 3}],
        ports: [{
          resource: ResourceType.ANY,
          corners: [{x: 3, y: 5}, {x: 2, y: 5}],
        }, {
          resource: ResourceType.WHEAT,
          corners: [{x: 1, y: 3}, {x: 1, y: 4}],
        }],
      },
      {
        connections: [5, 6],
        corners: [{x: 0, y: 3}, {x: 2, y: 0}],
        ports: [{
          resource: ResourceType.ORE,
          corners: [{x: 1, y: 1}, {x: 1, y: 2}],
        }],
      }
    ],
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
    beaches: () => [],
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
