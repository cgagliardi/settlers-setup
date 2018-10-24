import { Board, BoardSpec } from '../board';
import { Strategy } from './strategy';

export class RandomStrategy implements Strategy {
  readonly name = 'Random';

  generateBoard(spec: BoardSpec): Board {
    const board = new Board(spec);
    for (const hex of board.hexes) {
      hex.resource = board.remainingResources.pop();
    }
    return board;
  }
}
