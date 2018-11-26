import { Board, BoardSpec, GameStyle } from '../board';

/**
 * A strategy for creating a catan board.
 */
export interface Strategy {
  readonly name: string;
  generateBoard: (spec: BoardSpec) => Board;
}

export interface StrategyConstructor {
  new (gameStyle: GameStyle): Strategy;
}
