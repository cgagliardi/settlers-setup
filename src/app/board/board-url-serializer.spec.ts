import { serialize, deserialize } from './board-url-serializer';
import { Board, ResourceType, ROLL_NUMBERS } from './board';
import { BOARD_SPECS, BoardShape } from './board-specs';

describe('board-url-serializer', () => {
  let standardBoard: Board;
  let expansion56Board: Board;

  beforeAll(() => {
    standardBoard = new Board(BOARD_SPECS[BoardShape.STANDARD]);
    expansion56Board = new Board(BOARD_SPECS[BoardShape.EXPANSION6]);
  });

  it('starts with version', () => {
    const value = serialize(standardBoard);
    expect(value[0]).toBe('0');
  });

  it('serializes Standard shape', () => {
    const value = serialize(standardBoard);
    expect(value[1]).toBe('s');
    const deserialized = deserialize(value);
    expect(deserialized.shape).toBe(BoardShape.STANDARD);
  });

  it('serializes Expansion 5-6 shape', () => {
    const value = serialize(expansion56Board);
    expect(value[1]).toBe('6');
    const deserialized = deserialize(value);
    expect(deserialized.shape).toBe(BoardShape.EXPANSION6);
  });

  it('serializes Standard board', () => {
    const ports = standardBoard.ports;
    ports[0].resource = ResourceType.ANY;
    ports[1].resource = ResourceType.BRICK;
    ports[2].resource = ResourceType.BRICK;
    ports[3].resource = ResourceType.WHEAT;
    ports[4].resource = ResourceType.ORE;
    ports[5].resource = ResourceType.ORE;
    ports[6].resource = ResourceType.ANY;
    ports[7].resource = ResourceType.WOOD;
    ports[8].resource = ResourceType.ANY;

    fillHexes(standardBoard);

    const value = serialize(standardBoard);
    expect(extractPart(value, 0)).toBe('6h9i0');
    expect(extractPart(value, 1)).toBe('dmhg8q42er2');
    expect(extractPart(value, 2)).toBe('027p2sloos21bg');
    const deserialized = deserialize(value);

    for (let i = 0; i < ports.length; i++) {
      expect(deserialized.ports[i].resource).toBe(ports[i].resource);
    }
    for (let i = 0; i < standardBoard.hexes.length; i++) {
      const actualHex = deserialized.hexes[i];
      const expectedHex = standardBoard.hexes[i];
      expect(actualHex.resource).toBe(expectedHex.resource);
      expect(actualHex.rollNumber).toBe(expectedHex.rollNumber);
    }
  });

  function extractPart(value: string, i: number): string {
    expect(value.length).toBeGreaterThan(3);
    const parts = value.substr(2).split('-');
    expect(parts.length).toBe(3);
    return parts[i];
  }

  function fillHexes(board: Board) {
    let rollNumberIndex = 0;
    let resourceIndex = 0;

    const resourceTypeArray = [] as ResourceType[];
    for (const resource of Object.values(ResourceType)) {
      if (resource !== ResourceType.ANY) {
        resourceTypeArray.push(resource);
      }
    }

    for (const hex of board.hexes) {
      hex.resource = resourceTypeArray[resourceIndex];

      resourceIndex++;
      if (resourceIndex >= resourceTypeArray.length) {
        resourceIndex = 0;
      }

      if (hex.resource !== ResourceType.DESERT) {
        hex.rollNumber = ROLL_NUMBERS[rollNumberIndex];

        rollNumberIndex++;
        if (rollNumberIndex >= ROLL_NUMBERS.length) {
          rollNumberIndex = 0;
        }
      }
    }
  }
});
