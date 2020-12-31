import { BoardSpec, Hex, ResourceType } from '../board';
import { BoardShape } from './shapes-enum';
import { allowResourcesWithMainIslandRules, createByCounts, generatePorts, generateSeafarersBoard, inCoords } from './spec-util';

export const SEAFARERS1 = {
  shape: BoardShape.SEAFARERS1,
  dimensions: {width: 7, height: 7},
  resources: () => createByCounts(
      [ResourceType.BRICK, 3 + 1],
      [ResourceType.DESERT, 1],
      [ResourceType.ORE, 3 + 2],
      [ResourceType.SHEEP, 4 + 1],
      [ResourceType.WOOD, 4 + 1],
      [ResourceType.WHEAT, 4 + 1],
      [ResourceType.GOLD, 2],
  ),
  hexes: (board) => generateSeafarersBoard(board),
  requiredResources: [
    [ResourceType.WATER,
    [
      4,  0,
      1,  1,
      3,  1,
      2,  2,
      3,  3,
      0,  4,
      2,  4,
      4,  4,
      12, 4,
      3,  5,
      5,  5,
      7,  5,
      9, 5,
      11, 5,
      6,  6,
    ]]
  ],
  isResourceAllowed: allowResourcesWithMainIslandRules.bind(undefined,
    // Coordinates of the smaller islands.
    [
      2, 0,
      0, 2,
      1, 3,
      1, 5,
      2, 6,
      4, 6,
      8, 6,
      10, 6,
    ]),
  centerCoords: [{x: 8, y: 2}],
  beachConnections: [
    { x: 0, y: 2 },
    { x: 3, y: 0 },
    { x: 7, y: 0 },
    { x: 12, y: 0 },
    { x: 14, y: 3 },
    { x: 14, y: 5 },
    { x: 11, y: 7 },
    { x: 7, y: 7 },
    { x: 2, y: 7 },
    { x: 0, y: 4 },
  ],
  ports: () => generatePorts([
      11, 0,
      12, 0,

      8, 0,
      9, 0,

      5, 1,
      6, 1,

      4, 3,
      4, 2,

      13, 1,
      13, 2,

      13, 3,
      13, 4,

      6, 4,
      5, 4,

      9, 5,
      8, 5,

      12, 5,
      11, 5,
  ]),
  hasDefaultPortResources: false,
  rollNumbers: () => [
    // Standard numbers
    2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
    // Island numbers
    9, 2, 10, 8, 3, 4, 5, 11
  ],
} as BoardSpec;
