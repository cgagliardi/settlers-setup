import { BoardSpec, Board } from '../board';
import { Strategy } from './strategy';

class RandomStrategy implements Strategy {
  getName() {
    return 'Random';
  }

  generateBoard(spec: BoardSpec): Board {
    const board = new Board(spec);
    for (const hex of board.getAllHexes()) {
      hex.resource = board.remainingResources.pop();
    }
    return board;
  }
}
