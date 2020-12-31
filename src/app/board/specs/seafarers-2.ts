import { BoardSpec, Hex, ResourceType } from '../board';
import { BoardShape } from './shapes-enum';
import { createByCounts, generatePorts, generateSeafarersBoard, STANDARD_SEAFARERS_BEACH_CONNECTIONS } from './spec-util';

export const SEAFARERS2 = {
  shape: BoardShape.SEAFARERS2,
  dimensions: {width: 7, height: 7},
  resources: () => createByCounts(
      [ResourceType.BRICK, 4],
      [ResourceType.DESERT, 2],
      [ResourceType.ORE, 4],
      [ResourceType.SHEEP, 5],
      [ResourceType.WOOD, 4],
      [ResourceType.WHEAT, 4],
  ),
  hexes: (board) => generateSeafarersBoard(board),
  requiredResources: [
    [ResourceType.WATER,
    [
      6, 0,
      5, 1,
      7, 1,
      6, 2,
      10, 2,
      12, 2,
      1, 3,
      3, 3,
      5, 3,
      7, 3,
      9, 3,
      11, 3,
      0, 4,
      2, 4,
      4, 4,
      6, 4,
      5, 5,
      7, 5,
      6, 6,
    ]]
  ],
  isResourceAllowed: () => true,
  centerCoords: [],
  allCoastalHexes: true,
  beachConnections: STANDARD_SEAFARERS_BEACH_CONNECTIONS,
  ports: () => generatePorts([
    2, 0,
    3, 0,

    5, 0,
    6, 0,

    10, 0,
    11, 0,

    1, 2,
    1, 1,

    9, 1,
    8, 1,

    4, 3,
    3, 3,

    9, 5,
    8, 5,

    13, 5,
    13, 6,

    12, 7,
    11, 7,

    5, 7,
    4, 7,
  ]),
  hasDefaultPortResources: false,
  rollNumbers: () => [
    2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 12
  ],
} as BoardSpec;
