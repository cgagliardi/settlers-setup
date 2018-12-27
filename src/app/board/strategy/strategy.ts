import { Board, BoardSpec, GameStyle } from '../board';

export enum DesertPlacement {
  RANDOM = 'Random',
  CENTER = 'Center',
  OFF_CENTER = 'Off Center',
  COAST = 'Coast',
}

export enum ResourceDistribution {
  EVEN = 'Even',
  RANDOM = 'Random',
}

export interface StrategyOptions {
  gameStyle: GameStyle;
  desertPlacement: DesertPlacement;
  resourceDistribution: ResourceDistribution;
}

/**
 * A strategy for creating a catan board.
 */
export interface Strategy {
  readonly name: string;
  generateBoard: (spec: BoardSpec) => Board;
}

export interface StrategyConstructor {
  new (options: StrategyOptions): Strategy;
}
