import { BoardSpec, Board } from '../board';

/**
 * A strategy for creating a catan board.
 */
export interface Strategy {
  name: string;
  generateBoard: (spec: BoardSpec) => Board;
}
