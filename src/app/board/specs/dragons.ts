import { BoardSpec, Hex, ResourceType } from '../board';
import { BoardShape } from './shapes-enum';
import { allowResourcesWithMainIslandRules, createByCounts, generatePorts, generateSeafarersBoard, inCoords } from './spec-util';

export const DRAGONS = {
  shape: BoardShape.DRAGONS,
  dimensions: {width: 9, height: 7},
  resources: () => createByCounts(
      [ResourceType.BRICK, 5],
      [ResourceType.DESERT, 1],
      [ResourceType.ORE, 5],
      [ResourceType.SHEEP, 5],
      [ResourceType.WOOD, 6],
      [ResourceType.WHEAT, 6],
      [ResourceType.GOLD, 2],
  ),
  hexes: (board) => generateSeafarersBoard(board),
  requiredResources: [
    [
      ResourceType.WATER,
      [
        14, 0,
        9, 1,
        11, 1,
        13, 1,
        15, 1,
        6, 2,
        8, 2,
        10, 2,
        12, 2,
        14, 2,
        16, 2,
        5, 3,
        7, 3,
        15, 3,
        4, 4,
        6, 4,
        16, 4,
        3, 5,
        5, 5,
        4, 6,
        6, 6,
      ],
    ], [
      ResourceType.DESERT,
      [
        10, 4,
        12, 4,
        9, 5,
        11, 5,
        13, 5,
      ],
    ]
  ],
  isResourceAllowed: allowResourcesWithMainIslandRules.bind(undefined,
      // Coordinates of the dragon island.
      [
        9, 3,
        11, 3,
        13, 3,
        8, 4,
        14, 4,
        7, 5,
        15, 5,
        8, 6,
        10, 6,
        12, 6,
        14, 6,
      ]),
  centerCoords: [],
  beachConnections: [
    { x: 3, y: 0 },
    { x: 7, y: 0 },
    { x: 11, y: 0 },
    { x: 16, y: 0 },
    { x: 18, y: 3 },
    { x: 18, y: 5 },
    { x: 15, y: 7 },
    { x: 11, y: 7 },
    { x: 7, y: 7 },
    { x: 2, y: 7 },
    { x: 0, y: 4 },
    { x: 0, y: 2 },
  ],
  ports: () => generatePorts([
    1, 1,
    2, 1,

    3, 0,
    4, 0,

    6, 0,
    7, 0,

    9, 0,
    10, 0,

    12, 0,
    13, 0,

    1, 4,
    1, 3,

    1, 6,
    1, 5,

    3, 6,
    4, 6,
  ]),
  hasDefaultPortResources: false,
  rollNumbers: () => [
    12, 3, 8, 9, 4, 6, 5, 4, 10, 11, 9, 6, 11, 10, 5, 3, 8, 11, 8, 3, 4, 9, 5,
    3, 10, 10, 5, 2, 6
  ],
  dragons: [
    10, 4,
    11, 4,
    12, 4,
    13, 4,
    14, 4,
    9, 5,
    10, 5,
    11, 5,
    12, 5,
    13, 5,
    14, 5,
    15, 5,
    9, 6,
    10, 6,
    11, 6,
    12, 6,
    13, 6,
    14, 6,
    15, 6,
  ]
} as BoardSpec;
