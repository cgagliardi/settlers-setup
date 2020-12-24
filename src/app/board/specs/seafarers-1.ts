import { BoardSpec, Hex, ResourceType } from '../board';
import { BoardShape } from './shapes-enum';
import { allowResourcesWithMainIslandRules, createByCounts, generatePorts, generateStandardShapedBoard, inCoords } from './spec-util';

export const SEAFARERS1 = {
  shape: BoardShape.SEAFARERS1,
  dimensions: {width: 8, height: 7},
  resources: () => createByCounts(
      [ResourceType.BRICK, 3 + 1],
      [ResourceType.DESERT, 1],
      [ResourceType.ORE, 3 + 2],
      [ResourceType.SHEEP, 4 + 1],
      [ResourceType.WOOD, 4 + 1],
      [ResourceType.WHEAT, 4 + 1],
      [ResourceType.GOLD, 2],
  ),
  hexes: (board) => generateStandardShapedBoard(board),
  requiredResources: [
    [ResourceType.WATER,
    [
      5,  0,
      2,  1,
      4,  1,
      3,  2,
      0,  3,
      4,  3,
      14, 3,
      1,  4,
      3,  4,
      5,  4,
      13, 4,
      4,  5,
      6,  5,
      8,  5,
      10, 5,
      12, 5,
      7,  6,
    ]]
  ],
  isResourceAllowed: allowResourcesWithMainIslandRules.bind(undefined,
    // Coordinates of the smaller islands.
    [
      3, 0,
      1, 2,
      2, 3,
      2, 5,
      3, 6,
      5, 6,
      9, 6,
      11, 6,
    ]),
  centerCoords: [{x: 9, y: 2}],
  beachConnections: [
    { x: 1, y: 2 },
    { x: 4, y: 0 },
    { x: 8, y: 0 },
    { x: 13, y: 0 },
    { x: 16, y: 3 },
    { x: 15, y: 5 },
    { x: 12, y: 7 },
    { x: 8, y: 7 },
    { x: 3, y: 7 },
    { x: 0, y: 4 },
  ],
  ports: () => generatePorts([
      12, 0,
      13, 0,

      9, 0,
      10, 0,

      6, 1,
      7, 1,

      5, 3,
      5, 2,

      14, 1,
      14, 2,

      14, 3,
      14, 4,

      7, 4,
      6, 4,

      10, 5,
      9, 5,

      13, 5,
      12, 5,
  ]),
  rollNumbers: () => [
    // Standard numbers
    2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
    // Island numbers
    9, 2, 10, 8, 3, 4, 5, 11
  ],
} as BoardSpec;
