import { BoardSpec, Board } from '../board';

/**
 * A strategy for creating a catan board.
 */
export interface Strategy {
  readonly name: string;
  generateBoard: (spec: BoardSpec) => Board;
}
