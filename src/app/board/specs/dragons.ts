import { BoardSpec, Hex, ResourceType } from '../board';
import { BoardShape } from './shapes-enum';
import { allowResourcesWithMainIslandRules, createByCounts, generatePorts, generateStandardShapedBoard, inCoords } from './spec-util';

export const DRAGONS = {
  shape: BoardShape.DRAGONS,
  dimensions: {width: 10, height: 7},
  resources: () => createByCounts(
      [ResourceType.BRICK, 5],
      [ResourceType.DESERT, 1],
      [ResourceType.ORE, 5],
      [ResourceType.SHEEP, 5],
      [ResourceType.WOOD, 6],
      [ResourceType.WHEAT, 6],
      [ResourceType.GOLD, 2],
  ),
  hexes: (board) => generateStandardShapedBoard(board),
  requiredResources: [
    [
      ResourceType.WATER,
      [
        15, 0,
        10, 1,
        12, 1,
        14, 1,
        16, 1,
        7, 2,
        9, 2,
        11, 2,
        13, 2,
        15, 2,
        17, 2,
        0, 3,
        6, 3,
        8, 3,
        16, 3,
        18, 3,
        5, 4,
        7, 4,
        17, 4,
        4, 5,
        6, 5,
        5, 6,
        7, 6,
      ],
    ], [
      ResourceType.DESERT,
      [
        11, 4,
        13, 4,
        10, 5,
        12, 5,
        14, 5,
      ],
    ]
  ],
  isResourceAllowed: allowResourcesWithMainIslandRules.bind(undefined,
      // Coordinates of the dragon island.
      [
        10, 3,
        12, 3,
        14, 3,
        9, 4,
        15, 4,
        8, 5,
        16, 5,
        9, 6,
        11, 6,
        13, 6,
        15, 6,
      ]),
  centerCoords: [],
  beaches: () => [],
  ports: () => generatePorts([
    2, 1,
    3, 1,

    4, 0,
    5, 0,

    7, 0,
    8, 0,

    10, 0,
    11, 0,

    15, 0,
    16, 0,

    2, 4,
    2, 3,

    2, 6,
    2, 5,

    4, 6,
    5, 6,
  ]),
  rollNumbers: () => [
    12, 3, 8, 9, 4, 6, 5, 4, 10, 11, 9, 6, 11, 10, 5, 3, 8, 11, 8, 3, 4, 9, 5,
    3, 10, 10, 5, 2, 6
  ],
  dragons: [
    11, 4,
    12, 4,
    13, 4,
    14, 4,
    15, 4,
    10, 5,
    11, 5,
    12, 5,
    13, 5,
    14, 5,
    15, 5,
    16, 5,
    10, 6,
    11, 6,
    12, 6,
    13, 6,
    14, 6,
    15, 6,
    16, 6,
  ]
} as BoardSpec;
