import { Board, BoardSpec, ResourceType } from '../board';
import { Strategy, StrategyOptions, shufflePorts } from './strategy';
import { RandomQueue } from '../random-queue';

export class RandomStrategy implements Strategy {
  readonly name = 'Random';

  constructor(private readonly options: StrategyOptions) {}

  generateBoard(spec: BoardSpec): Board {
    const board = new Board(spec);
    if (this.options.shufflePorts) {
      shufflePorts(board);
    }
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
