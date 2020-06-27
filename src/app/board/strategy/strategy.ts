import { Board, BoardSpec, ResourceType } from '../board';
import { RandomQueue } from '../random-queue';

export enum DesertPlacement {
  RANDOM = 'Random',
  CENTER = 'Center',
  OFF_CENTER = 'Off Center',
  COAST = 'Coast',
}

export enum ResourceDistribution {
  EVEN = 'Even',
  CLUMPED = 'Clumped',
}

export interface StrategyOptions {
  desertPlacement: DesertPlacement;
  // 0 - similar resource types are clumped together.
  // 0.5 - random
  // 1 - resources are evenly distrubted.
  resourceDistribution: number;
  // 1 - every corner is as balanced as possible.
  // 0 - corners are either extremely good or extremely bad.
  numberDistribution: number;
  shufflePorts: boolean;
}

/**
 * A strategy for creating a catan board.
 */
export interface Strategy {
  readonly name: string;
  generateBoard: (spec: BoardSpec) => Board;
}

export type StrategyConstructor = new (options: StrategyOptions) => Strategy;

export function shufflePorts(board: Board) {
  const resources = new RandomQueue<ResourceType>();
  for (const beach of board.beaches) {
    for (const port of beach.ports) {
      resources.push(port.resource);
    }
  }
  for (const beach of board.beaches) {
    for (const port of beach.ports) {
      port.resource = resources.pop();
    }
  }
}
