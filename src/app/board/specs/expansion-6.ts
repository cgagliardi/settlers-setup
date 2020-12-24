import { ResourceType, Hex, BoardSpec } from '../board';
import { BoardShape } from './shapes-enum';
import { createByCounts, generateStandardShapedBoard, inCoords, generatePorts } from './spec-util';

export const EXPANSION6 = {
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
  requiredResources: [],
  isResourceAllowed: () => true,
  centerCoords: [{x: 4, y: 3}, {x: 6, y: 3}],
  ports: () => [
    {
      resource: ResourceType.ANY,
      corners: [{x: 3, y: 0}, {x: 4, y: 0}],
    }, {
      resource: ResourceType.SHEEP,
      corners: [{x: 6, y: 0}, {x: 7, y: 0}],
    }, {
      resource: ResourceType.ANY,
      corners: [{x: 9, y: 1}, {x: 10, y: 1}],
    }, {
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
    }, {
      resource: ResourceType.WOOD,
      corners: [{x: 7, y: 7}, {x: 6, y: 7}],
    }, {
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
    }, {
      resource: ResourceType.ORE,
      corners: [{x: 1, y: 3}, {x: 1, y: 2}],
    },
  ],
  beachConnections: [
    { x: 8, y: 0, label: 1 },
    { x: 12, y: 3, label: 2 },
    { x: 9, y: 7, label: 3 },
    { x: 4, y: 7, label: 4 },
    { x: 0, y: 4, label: 5 },
    { x: 3, y: 0, label: 6 },
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
    [12, 2],
  ),
} as BoardSpec;
