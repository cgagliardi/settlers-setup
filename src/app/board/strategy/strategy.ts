import { Board, BoardSpec, ResourceType } from '../board';
import { RandomQueue } from '../random-queue';

export enum DesertPlacement {
  RANDOM = 'Random',
  CENTER = 'Center',
  OFF_CENTER = 'Off Center',
  INLAND = 'Inland',
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
  // 0 - good numbers are grouped together
  // 1 - each board corner is as close in value to others as possible
  numberDistribution: number;
  shufflePorts: boolean;
  // Allow a resource hex to be placed next to a port of the same type.
  allowResourceOnPort: boolean;
}

/**
 * A strategy for creating a catan board.
 */
export interface Strategy {
  readonly name: string;
  generateBoard: (spec: BoardSpec) => { board: Board, score: number };
}

export type StrategyConstructor = new (options: StrategyOptions) => Strategy;

export function shufflePorts(board: Board) {
  const resources = new RandomQueue<ResourceType>();
  for (const port of board.ports) {
    resources.push(port.resource);
  }
  for (const port of board.ports) {
    port.resource = resources.pop()!;
  }
}
