/**
 * @fileoverview Serializes and deserializes boards for use in a URL.
 */
import { Board, ResourceType, Port, Hex, BoardSpec } from './board';
import { BOARD_SPECS, SHAPE_URL_KEYS } from './board-specs';
import { assert } from '../util/assert';
import { FixedValuesSerializer } from '../util/fixed-values-serializer';
import { BoardShape } from './specs/shapes-enum';
import { uniq } from 'lodash';

const PORT_RESOURCES = [
  ResourceType.ANY,
  ResourceType.BRICK,
  ResourceType.ORE,
  ResourceType.SHEEP,
  ResourceType.WHEAT,
  ResourceType.WOOD
] as ResourceType[];
const portResourceSerializer = new FixedValuesSerializer(PORT_RESOURCES);

const HEX_RESOURCES = [
  ResourceType.DESERT,
  ResourceType.BRICK,
  ResourceType.ORE,
  ResourceType.SHEEP,
  ResourceType.WHEAT,
  ResourceType.WOOD,
  ResourceType.GOLD,
] as ResourceType[];

const ROLL_NUMS = [null, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12] as Array<number|null>;
const rollNumSerializer = new FixedValuesSerializer(ROLL_NUMS);

/**
 * The board is serialized as
 * 3[Board Shape][Hex Resources]-[Roll Numbers]-[Port Resources]
 * Where [Board Shape] is always a single character and the final "-[Port Resources]" is optional.
 */
export function serialize(board: Board): string {
  const shape = serializeShape(board.shape);

  const hexResourceSerializer = createHexResourceSerializer(board.spec);
  const hexResources = hexResourceSerializer.serialize(board.mutableHexes.map(h => h.resource!));
  const rollNums = rollNumSerializer.serialize(board.mutableHexes.map(h => h.rollNumber));

  let serialized = '3' + shape + hexResources + '-' + rollNums;

  if (!hasDefaultPorts(board)) {
    const portResources = portResourceSerializer.serialize(board.ports.map(p => p.resource));
    serialized += '-' + portResources;
  }

  return serialized;
}

function hasDefaultPorts(board: Board) {
  const defaultPorts = board.spec.ports();
  return board.ports.every((port, i) => port.resource === defaultPorts[i].resource);
}

export function deserialize(val: string): Board {
  const version = val[0];
  // Older versions are not supported and will throw an error.
  assert(version === '3');
  const shape = deserializeShape(val[1]);
  const boardSpec = BOARD_SPECS[shape];
  const board = new Board(boardSpec);

  const parts = val.substr(2).split('-');
  const hexResourceVal = parts[0];
  const rollNumVal = parts[1];

  const hexResources = boardSpec.resources();
  const rollNums: Array<number|null> = boardSpec.rollNumbers();
  // Account for the "null" values that will be in roll numbers, which represents a desert
  // hex. Desert hexes do not have roll numbers.
  for (const resource of hexResources) {
    if (resource === ResourceType.DESERT) {
      rollNums.push(null);
    }
  }

  const hexResourceSerializer = createHexResourceSerializer(boardSpec);
  deserializeEntities(hexResourceVal, hexResourceSerializer, hexResources, board.mutableHexes,
      (hex, resource) => hex.resource = resource);
  deserializeEntities(rollNumVal, rollNumSerializer, rollNums, board.mutableHexes,
      (hex, num) => hex.rollNumber = num);

  // The last section of the URL is the placement of the ports. This is only set when it is not
  // the default.
  if (parts.length > 2) {
    const portsVal = parts[2];

    const portResources = boardSpec.ports().map(p => p.resource) as Array<ResourceType>;

    deserializeEntities(portsVal, portResourceSerializer, portResources, board.ports,
      (port, resource) => port.resource = resource);
  }

  return board;
}

function createHexResourceSerializer(spec: BoardSpec): FixedValuesSerializer<ResourceType> {
  return new FixedValuesSerializer(uniq(spec.resources()).sort() as ResourceType[]);
}

/**
 * Returns true if there are custom ports specified in the URL.
 */
export function hasCustomPorts(val: string) {
  return val.split('-').length > 2;
}

function serializeShape(shape: BoardShape): string {
  const key = SHAPE_URL_KEYS[shape];
  if (!key) {
    throw new Error('Unsupported shape ' + shape);
  }
  return key;
}

function deserializeShape(val: string): BoardShape {
  for (const [shape, urlKey] of Object.entries(SHAPE_URL_KEYS)) {
    if (urlKey === val) {
      return shape as BoardShape;
    }
  }
  throw new Error('Unsupported shape ' + val);
}

function deserializeEntities<E, V>(
    serialized: string,
    serializer: FixedValuesSerializer<V>,
    valueSet: Array<V>,
    list: ReadonlyArray<E>,
    setter: (entity: E, value: V) => void) {
  const values = serializer.deserialize(serialized, valueSet);
  for (let i = 0; i < list.length; i++) {
    if (values[i] !== undefined) {
      setter(list[i], values[i]);
    }
  }
}
