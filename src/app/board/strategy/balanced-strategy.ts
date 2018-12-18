import { Board, BoardSpec, ResourceType, Hex, getNumDots, GameStyle, USABLE_RESOURCES } from '../board';
import { Strategy } from './strategy';
import * as _ from 'lodash';
import { assert } from 'src/app/assert';
import { RandomQueue } from '../random-queue';

function hasAll<T>(set: Set<T>|Map<T, any>, ...vals: T[]): boolean {
  for (const val of vals) {
    if (!set.has(val)) {
      return false;
    }
  }
  return true;
}

function sumByKey<T>(map: Map<T, number>, ...keys: T[]): number {
  let sum = 0;
  for (const key of keys) {
    sum += map.get(key) || 0;
  }
  return sum;
}

function findLowestBy<T>(collection: ReadonlyArray<T>, fn: (v: T) => number): T|undefined {
  let lowestVal;
  let lowestNum = Number.MAX_VALUE;
  for (const val of collection) {
    const score = fn(val);
    if (score < lowestNum) {
      lowestNum = score;
      lowestVal = val;
    }
  }
  return lowestVal;
}

function findHighestBy<T>(collection: ReadonlyArray<T>, fn: (v: T) => number): T|undefined {
  let highestVal;
  let highestNum = Number.MIN_VALUE;
  for (const val of collection) {
    const score = fn(val);
    if (score > highestNum) {
      highestNum = score;
      highestVal = val;
    }
  }
  return highestVal;
}

function findAllLowestBy<T>(collection: ReadonlyArray<T>, fn: (v: T) => number): T[]|undefined {
  let lowestVals;
  let lowestNum = Number.MAX_VALUE;
  for (const val of collection) {
    const score = fn(val);
    if (score < lowestNum) {
      lowestNum = score;
      lowestVals = [val];
    } else if (score === lowestNum) {
      lowestVals.push(val);
    }
  }
  return lowestVals;
}

export class BalancedStrategy implements Strategy {
  readonly name = 'Balanced';

  private remainingHexes: Hex[];
  private remainingNumbers: number[];
  private remainingResources: RandomQueue<ResourceType>;
  private board: Board;
  private initialResources: ResourceType[];

  constructor(readonly gameStyle: GameStyle) {}

  generateBoard(spec: BoardSpec): Board {
    let board;

    do {
      // TODO - board construction is expensive. Implement a way to reset resources.
      this.remainingNumbers = _.sortBy(spec.rollNumbers(), n => getNumDots(n));
      this.remainingResources = new RandomQueue(spec.resources());
      this.initialResources = USABLE_RESOURCES.slice();
      board = new Board(spec);
    } while (!this.placeHexes(board));

    this.board = board;

    this.remainingHexes = board.hexes.filter(
        hex => hex.resource !== ResourceType.DESERT && !hex.rollNumber);
    assert(this.remainingHexes.length === this.remainingNumbers.length);

    while (this.remainingHexes.length) {
      this.placeNumber();
    }

    return board;
  }

  /**
   * @returns False if it failed to succesfully build a random board that meets the requirements of
   * the algorithm.
   */
  private placeHexes(board: Board): boolean {
    // First place one of each resource and a corresponding high number such that each of these
    // high numbers are not touching each other.
    for (const resource of this.initialResources) {
      const availableHexes = board.hexes.filter(h =>
          !h.getPortResources().includes(resource) &&
          !h.getNeighbors().find(neighbor => !!neighbor.resource));
      const hex = _.sample(availableHexes);
      hex.resource = resource;
      hex.rollNumber = this.remainingNumbers.pop();
      this.remainingResources.remove(resource);
    }

    // First set the resources on hexes with ports such that they don't get a desert and don't
    // have their matching resource.
    const hexesWithTypedPorts = board.hexes.filter(hex =>
        !hex.resource &&
        hex.getPortResources().filter(r => r !== ResourceType.ANY).length);
    for (const hex of hexesWithTypedPorts) {
      const excludeResources = hex.getNeighbors().map(h => h.resource).map(r => r);
      excludeResources.push(ResourceType.DESERT);
      excludeResources.push(...hex.getPortResources());
      hex.resource = this.remainingResources.popExcluding(...excludeResources);
    }

    // Now set all remaining hexes at random, but avoid neighboring pieces.
    for (const hex of board.hexes) {
      if (hex.resource) {
        continue;
      }
      const resource = this.remainingResources.popExcluding(
          ...hex.getNeighbors().map(h => h.resource).map(r => r));
      if (!resource) {
        return false;
      }
      hex.resource = resource;
    }
    return true;
  }

  placeNumber(): boolean {
    this.scoreBoard();

    const nextNum = _.last(this.remainingNumbers);

    let hex;
    hex = _.sample(findAllLowestBy(this.remainingHexes, h => h.score));

    // const resource = this.findLowestResourceType(this.board, this.remainingHexes);
    // const hexes = this.remainingHexes.filter(h => h.resource === resource);
    // assert(hexes.length);
    // hex = _.sample(findAllLowestBy(hexes, h => h.score));

    _.pull(this.remainingHexes, hex);
    this.remainingNumbers.pop();

    hex.rollNumber = nextNum;

    return !!this.remainingHexes.length;
  }

  /**
   * @returns The hex that has the least number of neighbors that have their rollNumbers populated.
   *    If there are multiple hexes with the same value, returns a random one from that set.
   */
  private findLeastNeighboringNumbers(hexes: Hex[]): Hex {
    const toNumNumberedNeighbors =
        hex => hex.getNeighbors().filter(n => n.rollNumber).length;
    const allNumNeighbors = hexes.map(toNumNumberedNeighbors);
    const lowestNum = findLowestBy(allNumNeighbors, _.identity);

    const allWithLowest = hexes.filter(hex => toNumNumberedNeighbors(hex) === lowestNum);
    assert(allWithLowest.length);
    return _.sample(allWithLowest);
  }

  /**
   * @returns The lowest scored (by sum of each hex) resource of the resoureces available in
   * remainingHexes.
   */
  private findLowestResourceType(board: Board, remainingHexes: Hex[]): ResourceType {
    // Figure out what resources are still left to populate so that we don't return a value that
    // can't be set.
    const remainingResources = _.uniq(remainingHexes.map(hex => hex.resource));

    const lowestResource = findLowestBy(remainingResources, resource =>
        _.meanBy(board.hexes.filter(hex => hex.resource === resource).map(hex => hex.score)));
    return assert(lowestResource);
  }

  scoreBoard() {
    const nextNumDots = this.remainingNumbers.length ?
        getNumDots(_.last(this.remainingNumbers)) : 0;

    // First score every corner by evaluating how good of a spot that specific corner is.
    for (const corner of this.board.corners) {
      const hexes = corner.getHexes();
      // Sum te value of each neighboring hex.
      let score = _.sumBy(hexes, hex =>
          this.getResourceValue(hex.resource) * this.getRollNumValue(hex, 0.5));
      const notes = [];
      if (corner.port) {
        // TODO: Think about this more. Maybe a ? port should get less weight.
        notes.push(['Has port']);
        score += 2;
      }

      // Look for any good combinations.
      const resourceOdds = this.computeRollOddsPerResource(hexes, nextNumDots);
      const addCombo = (name: string, multiplier: number, ...resources: ResourceType[]) => {
        if (hasAll(resourceOdds, ...resources)) {
          const addition = sumByKey(resourceOdds, ...resources) * 0.1 * multiplier;
          notes.push(name + ' corner: ' + _.round(addition, 2));
          score += addition;
        }
      };
      addCombo('City', 3, ResourceType.WHEAT, ResourceType.ORE);
      addCombo('Road', 2.5, ResourceType.BRICK, ResourceType.WOOD);
      if (this.gameStyle === GameStyle.STANDARD) {
        addCombo('Development card', 1, ResourceType.SHEEP, ResourceType.ORE, ResourceType.WHEAT);
      }
      corner.notes = notes.join('\n');
      corner.score = score;
    }

    for (const hex of this.board.hexes) {
      const sumOfCorners = _.sumBy(hex.getCorners(), corner => corner.score);
      // Evaluate the hex's resource and roll number.
      const hexMultiplier =
          Math.pow(this.getResourceValue(hex.resource) *
                   this.getRollNumValue(hex, 1), 0.25);
      // If the hex is on a beach, then sumOfCorners will inevitably be smaller, resulting in a
      // smaller score. The beachMultipler lessens this effect. Leaving this value out will actually
      // make the board more balanced, but it also means that almost all of the red numbers are on
      // a beach.
      // const beachMultiplier = Math.pow(6 / hex.getNeighbors().length, 0.1);
      const beachMultiplier = 1;
      hex.score = sumOfCorners * hexMultiplier * beachMultiplier;
    }
  }

  private computeRollOddsPerResource(hexes: Hex[], defaultRollScore: number): Map<ResourceType, number> {
    const map = new Map();
    for (const hex of hexes) {
      if (hex.resource === ResourceType.DESERT) {
        continue;
      }
      let num = this.getRollNumValue(hex, defaultRollScore);
      if (map.has(hex.resource)) {
        num += map.get(hex.resource);
      }
      map.set(hex.resource, num);
    }
    return map;
  }

  private getResourceValue(resource: ResourceType): number {
    assert(resource);
    if (resource === ResourceType.DESERT) {
      return 0;
    }
    // TODO: These scores will need some more thought.
    switch (this.gameStyle) {
      case GameStyle.CITIES_AND_KNIGHTS:
        switch (resource) {
          case ResourceType.SHEEP:
            return 1;
          case ResourceType.ORE:
            return 1.2;
          default:
            return 1.1;
        }

      default:
        if (resource === ResourceType.ORE) {
          return 1.1;
        } else {
          return 1;
        }
    }
  }

  private getRollNumValue(hex: Hex, missingValue = 0): number {
    return hex.rollNumber ? Math.pow(getNumDots(hex.rollNumber), 1.2) : missingValue;
  }
}
