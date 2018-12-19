import { Board, BoardSpec, ResourceType, Hex, getNumDots, GameStyle, USABLE_RESOURCES } from '../board';
import { Strategy } from './strategy';
import * as _ from 'lodash';
import { assert } from 'src/app/util/assert';
import { RandomQueue } from '../random-queue';
import { findAllLowestBy, findLowestBy, hasAll, sumByKey, findHighestBy } from 'src/app/util/collections';

export class BalancedStrategy implements Strategy {
  readonly name = 'Balanced';

  private remainingHexes: Hex[];
  private remainingNumbers: number[];
  private remainingResources: RandomQueue<ResourceType>;
  private board: Board;
  private initialResources: ResourceType[];

  constructor(readonly gameStyle: GameStyle) {}

  generateBoard(spec: BoardSpec): Board {
    // The algorithm in this class isn't great. So to compensate, we genrate 20 boards, and return
    // the best one.
    let bestBoard;
    let lowestScore = Number.MAX_VALUE;
    for (let i = 0; i < 20; i++) {
      const board = this.generateSingleBoard(spec);
      const score = this.evaluateBoard(board);
      if (lowestScore > score) {
        bestBoard = board;
        lowestScore = score;
      }
    }
    console.log('Board score: ' + lowestScore);
    return bestBoard;
  }

  /**
   * @returns A number that gives the quality of the board, where the lower the number, the better
   * the board.
   */
  private evaluateBoard(board: Board): number {
    const relevantCorners = board.corners.filter(corner => {
      const hexes = corner.getHexes();
      return hexes.length === 3 && !hexes.find(hex => hex.resource === ResourceType.DESERT);
    });
    const highScore = findHighestBy(relevantCorners, corner => corner.score).score;
    const lowScore = findLowestBy(relevantCorners, corner => corner.score).score;
    return highScore - lowScore;
  }

  private generateSingleBoard(spec: BoardSpec): Board {
    // Place all of the resource hexes. This function can fail, so its run in a loop until it
    // succeeds. Place hexes also places a few roll numbers.
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

    // Place the roll numbers until there are none left.
    while (this.remainingHexes.length) {
      this.placeNumber();
    }
    this.scoreBoard();

    return board;
  }

  /**
   * @returns False if it failed to succesfully build a random board that meets the requirements of
   * the algorithm.
   */
  private placeHexes(board: Board): boolean {
    // First place one of each resource and a corresponding high number such that each of these
    // high numbers are not touching each other. This ensures every resource has at least one
    // good roll number.
    for (const resource of this.initialResources) {
      const availableHexes = board.hexes.filter(h =>
          !h.getPortResources().includes(resource) &&
          !h.getNeighbors().find(neighbor => !!neighbor.resource));
      const hex = _.sample(availableHexes);
      hex.resource = resource;
      hex.rollNumber = this.remainingNumbers.pop();
      this.remainingResources.remove(resource);
    }

    // Next set the resources on hexes with typed ports such that they don't get a desert and don't
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

    // Now set all remaining hexes at random, but without any of the same resources touching itself.
    // If we are unable to replace a hex without it touching the same resource type, return false
    // so that the function can be ran again on a new board.
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

  /**
   * Scores every corner and every hex of the board, then places the highest available number of the
   * lowest valued hex.
   */
  private placeNumber() {
    this.scoreBoard();

    const hex = _.sample(findAllLowestBy(this.remainingHexes, h => h.score));
    _.pull(this.remainingHexes, hex);

    hex.rollNumber = this.remainingNumbers.pop();
  }

  /**
   * Computes a score for every corner of the board based on the value of each roll number/resource
   * at that corner and the presence of a port. Then computes the value of each hex but summing the
   * corners of that hex.
   */
  private scoreBoard() {
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
