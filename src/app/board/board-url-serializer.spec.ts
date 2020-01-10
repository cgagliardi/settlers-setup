import { serialize, deserialize } from './board-url-serializer';
import { Board, ResourceType, ROLL_NUMBERS, BoardSpec } from './board';
import { BOARD_SPECS, BoardShape } from './board-specs';

describe('board-url-serializer', () => {
  let standardBoard: Board;
  let expansion56Board: Board;

  beforeAll(() => {
    standardBoard = createBoard(BOARD_SPECS[BoardShape.STANDARD]);
    expansion56Board = createBoard(BOARD_SPECS[BoardShape.EXPANSION6]);
  });

  it('starts with version', () => {
    const value = serialize(standardBoard);
    expect(value[0]).toBe('1');
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
    const value = serialize(standardBoard);
    expect(extractPart(value, 0)).toBe('4R8g');
    expect(extractPart(value, 1)).toBe('1sePYp3');
    expect(extractPart(value, 2)).toBe('xv56o3Y11');
    const deserialized = deserialize(value);

    const ports = standardBoard.ports;
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

  function createBoard(spec: BoardSpec): Board {
    const board = new Board(spec);

    const resources = spec.resources();
    resources.sort();
    const rollNums = spec.rollNumbers();
    rollNums.sort();

    for (const hex of board.hexes) {
      hex.resource = resources.shift();

      if (hex.resource !== ResourceType.DESERT) {
        hex.rollNumber = rollNums.shift();
      }
    }

    return board;
  }
});
