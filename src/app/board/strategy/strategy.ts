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
  RANDOM = 'Random',
}

export interface StrategyOptions {
  desertPlacement: DesertPlacement;
  resourceDistribution: ResourceDistribution;
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
