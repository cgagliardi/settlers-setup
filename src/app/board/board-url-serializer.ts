/**
 * @fileoverview Serializes and deserializes boards for use in a URL.
 */
import { Board, ResourceType, Port, Hex } from './board';
import { BoardShape, BOARD_SPECS } from './board-specs';
import { assert } from '../util/assert';
import { FixedValuesSerializer } from '../util/fixed-values-serializer';

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
  ResourceType.WOOD
] as ResourceType[];
const hexResourceSerializer = new FixedValuesSerializer(HEX_RESOURCES);

const ROLL_NUMS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12] as number[];
const rollNumSerializer = new FixedValuesSerializer(ROLL_NUMS);

/**
 * The board is serialized in the following format
 * 0s
 * 012345678901234567890
 * 0: The version of the serializer
 * 1: The shape of the board (S or 6)
 *
 */
export function serialize(board: Board): string {
  const version = '0';
  const shape = serializeShape(board.shape);
  const portResources = portResourceSerializer.serialize(board.ports.map(p => p.resource));
  const hexResources = hexResourceSerializer.serialize(board.hexes.map(h => h.resource));
  const rollNums = rollNumSerializer.serialize(board.hexes.map(h => h.rollNumber));

  return version + shape + portResources + '-' + hexResources + '-' + rollNums;
}

export function deserialize(val: string): Board {
  const version = val[0];
  assert(version === '0', 'Unsupported serialization version ' + val);

  const shape = deserializeShape(val[1]);
  const board = new Board(BOARD_SPECS[shape]);

  const [portVal, hexResourceVal, rollNumVal] = val.substr(2).split('-');

  deserializeEntities(portVal, portResourceSerializer, board.ports,
      (port, resource) => port.resource = resource);
  deserializeEntities(hexResourceVal, hexResourceSerializer, board.hexes,
      (hex, resource) => hex.resource = resource);
  deserializeEntities(rollNumVal, rollNumSerializer, board.hexes,
      (hex, num) => hex.rollNumber = num);

  return board;
}

function serializeShape(shape: BoardShape): string {
  switch (shape) {
    case BoardShape.STANDARD:
      return 's';
    case BoardShape.EXPANSION6:
      return '6';
  }
  throw new Error('Unsupported shape ' + shape);
}

function deserializeShape(val: string): BoardShape {
  switch (val) {
    case 's':
      return BoardShape.STANDARD;
    case '6':
      return BoardShape.EXPANSION6;
  }
  throw new Error('Unsupported shape ' + val);
}

function deserializeEntities<E, V>(
    serialized: string,
    serializer: FixedValuesSerializer<V>,
    list: ReadonlyArray<E>,
    setter: (entity: E, value: V) => {}) {
  const values = serializer.deserialize(serialized);
  for (let i = 0; i < list.length; i++) {
    if (values[i] !== undefined) {
      setter(list[i], values[i]);
    }
  }
}
