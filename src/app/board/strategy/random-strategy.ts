import { Board, BoardSpec, ResourceType } from '../board';
import { Strategy, StrategyOptions, shufflePorts } from './strategy';
import { RandomQueue } from '../random-queue';

export class RandomStrategy implements Strategy {
  readonly name = 'Random';

  constructor(private readonly options: StrategyOptions) {}

  generateBoard(spec: BoardSpec): { board: Board, score: number } {
    const board = new Board(spec);
    board.reset();
    if (this.options.shufflePorts) {
      shufflePorts(board);
    }
    const rollNumbers = new RandomQueue(spec.rollNumbers());
    const resources = new RandomQueue(spec.resources());
    for (const hex of board.mutableHexes) {
      if (resources.length) {
        const excluded = [];
        if (!board.isResourceAllowed(hex, ResourceType.GOLD)) {
          excluded.push(ResourceType.GOLD);
        }
        if (!board.isResourceAllowed(hex, ResourceType.DESERT)) {
          excluded.push(ResourceType.DESERT);
        }
        hex.resource = resources.popExcluding(...excluded)!;
      }
      if (hex.resource !== ResourceType.DESERT && !rollNumbers.isEmpty()) {
        hex.rollNumber = rollNumbers.pop()!;
      }
    }
    // This is done so that RandomStrategy can be used during development, when a spec isn't
    // fully correct yet. Allowing you to render it and use ?debug=1 to get the coordinates
    // of hexes and corners.
    for (const hex of board.hexes) {
      if (!hex.resource) {
        hex.resource = ResourceType.WATER;
      }
    }
    return { board!, score: 0 };
  }
}
