import { Board, BoardSpec, ResourceType, GameStyle } from '../board';
import { Strategy, StrategyOptions } from './strategy';
import { RandomQueue } from '../random-queue';

export class RandomStrategy implements Strategy {
  readonly name = 'Random';

  constructor(options: StrategyOptions) {}

  generateBoard(spec: BoardSpec): Board {
    const board = new Board(spec);
    const rollNumbers = new RandomQueue(spec.rollNumbers());
    const resources = new RandomQueue(spec.resources());
    for (const hex of board.hexes) {
      hex.resource = resources.pop();
      if (hex.resource !== ResourceType.DESERT && !rollNumbers.isEmpty()) {
        hex.rollNumber = rollNumbers.pop();
      }
    }
    return board;
  }
}
