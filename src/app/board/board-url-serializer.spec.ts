import { serialize, deserialize } from './board-url-serializer';
import { Board, ResourceType, ROLL_NUMBERS, BoardSpec } from './board';
import { BOARD_SPECS } from './board-specs';

import { flatten } from 'lodash';
import { BoardShape } from './specs/shapes-enum';

describe('board-url-serializer', () => {
  let standardBoard: Board;
  let expansion56Board: Board;

  beforeAll(() => {
    standardBoard = createBoard(BOARD_SPECS[BoardShape.STANDARD]);
    expansion56Board = createBoard(BOARD_SPECS[BoardShape.EXPANSION6]);
  });

  it('serializes Standard board', () => {
    const value = serialize(standardBoard);
    expect(value[0]).toBe('1');

    const parts = value.substr(1).split('-');
    expect(parts.length).toBe(2);
    expect(parts[0]).toBe('1sePYp3');
    expect(parts[1]).toBe('xv56o3Y11');
    const deserialized = deserialize(value);

    expect(deserialized.shape).toBe(BoardShape.STANDARD);

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

  it('serializes Standard board with custom ports', () => {
    const board = createBoard(BOARD_SPECS[BoardShape.STANDARD], true /* change ports */);

    const value = serialize(board);
    const parts = value.substr(1).split('-');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('1sePYp3');
    expect(parts[1]).toBe('xv56o3Y11');
    expect(parts[2]).toBe('5d1H');
    const deserialized = deserialize(value);

    expect(deserialized.shape).toBe(BoardShape.STANDARD);

    const ports = board.ports;
    for (let i = 0; i < ports.length; i++) {
      expect(deserialized.ports[i].resource).toBe(ports[i].resource);
    }
    for (let i = 0; i < board.hexes.length; i++) {
      const actualHex = deserialized.hexes[i];
      const expectedHex = board.hexes[i];
      expect(actualHex.resource).toBe(expectedHex.resource);
      expect(actualHex.rollNumber).toBe(expectedHex.rollNumber);
    }
  });

  it('serializes Expansion 5-6', () => {
    const value = serialize(expansion56Board);
    expect(value[0]).toBe('2');

    const parts = value.substr(1).split('-');
    expect(parts.length).toBe(2);
    expect(parts[0]).toBe('tjZ9m4u7rE');
    expect(parts[1]).toBe('lhKI0wnPnF0Fl');
    const deserialized = deserialize(value);

    expect(deserialized.shape).toBe(BoardShape.EXPANSION6);

    const ports = expansion56Board.ports;
    for (let i = 0; i < ports.length; i++) {
      expect(deserialized.ports[i].resource).toBe(ports[i].resource);
    }
    for (let i = 0; i < expansion56Board.hexes.length; i++) {
      const actualHex = deserialized.hexes[i];
      const expectedHex = expansion56Board.hexes[i];
      expect(actualHex.resource).toBe(expectedHex.resource);
      expect(actualHex.rollNumber).toBe(expectedHex.rollNumber);
    }
  });

  function createBoard(spec: BoardSpec, changePorts = false): Board {
    const board = new Board(spec);

    // Sort the values so that it's a custom, but unique order.
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

    if (!changePorts) {
      return board;
    }

    const portResources = spec.ports().map(p => p.resource);
    portResources.sort();
    let i = 0;
    for (const port of board.ports) {
      port.resource = portResources[i];
      i++;
    }

    return board;
  }
});
