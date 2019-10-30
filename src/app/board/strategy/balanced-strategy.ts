import { Board, BoardSpec, ResourceType, Hex, getNumDots, USABLE_RESOURCES, Coordinate } from '../board';
import { Strategy, StrategyOptions, DesertPlacement, ResourceDistribution, shufflePorts } from './strategy';
import { assert } from 'src/app/util/assert';
import { RandomQueue } from '../random-queue';
import { findAllLowestBy, hasAll, sumByKey, findHighestBy } from 'src/app/util/collections';
import { BoardShape } from '../board-specs';

import last from 'lodash/last';
import mean from 'lodash/mean';
import pull from 'lodash/pull';
import round from 'lodash/round';
import sample from 'lodash/sample';
import sortBy from 'lodash/sortBy';
import sum from 'lodash/sum';
import sumBy from 'lodash/sumBy';

// When generating a board, several boards are generated, returning the best one. The number of
// boards generated is controlled by the constants below.
// At least MIN_ATTEMPTS boards are generated.
const MIN_ATTEMPTS = 30;
// Board generation runs for at least MIN_TIME milliesconds.
const MIN_TIME = 250;
// The first execution of board generation is substantially slower, so FIRST_MIN_TIME milliseconds
// is used on page load.
const FIRST_MIN_TIME = 400;

// This magic number is used to score hexes. A hex is scored as the sum of it's corner values,
// where each value is raised by this power. This number was found by trying several iterations of
// numbers to see which produced the optimal score.
const HEX_CORNER_POWER = 6;

let firstGenerated = false;

export class BalancedStrategy implements Strategy {
  readonly name = 'Balanced';

  private desertPlacement: DesertPlacement;

  private remainingHexes: Hex[];
  private remainingNumbers: number[];
  private remainingResources: RandomQueue<ResourceType>;
  private board: Board;
  private initialResources: RandomQueue<ResourceType>;

  constructor(readonly options: StrategyOptions) {}

  generateBoard(spec: BoardSpec): Board {
    // Because we randomly generate N boards and pick the best one, the scoring can bias towards a
    // specific desert placement. To counteract this, we decide the desert placement up front.
    this.desertPlacement = this.chooseDesertPlacement(spec);

    // Each board is randomly generated with a best effort. We generate several boards and return
    // the best one.
    let bestBoard: Board;
    let lowestScore = Number.MAX_VALUE;
    let lowestScoreStats;
    const startTime = Date.now();
    const minTime = firstGenerated ? MIN_TIME : FIRST_MIN_TIME;
    let i = 0;
    for (i = 0; i < MIN_ATTEMPTS || Date.now() - startTime < minTime; i++) {
      this.board = this.generateSingleBoard(spec);
      const [score, stats] = this.scoreBoard();
      if (lowestScore > score) {
        bestBoard = this.board;
        lowestScore = score;
        lowestScoreStats = stats;
      }
    }
    console.log('num boards generated: ' + i);
    console.log('Board score: ' + lowestScore);
    console.log(lowestScoreStats);

    firstGenerated = true;
    return bestBoard;
  }

  /**
   * @returns A number that gives the quality of the board, where the lower the number, the better
   * the board.
   */
  private scoreBoard(): [number, {standardDeviation: number, highestCorner: number}] {
    // Compute the standard deviation of the corner scores.
    this.scoreHexesAndCorners(true /* balanceCoastAndDesert */);
    const scores = this.board.corners.map(c => c.score);
    const scoreMean = mean(scores);
    const scoreSum = sum(scores.map(s => Math.pow(scoreMean - s, 2)));
    const standardDeviation = Math.sqrt(scoreSum / this.board.corners.length);

    this.scoreHexesAndCorners(false /* balanceCoastAndDesert */);
    const highestCorner = findHighestBy(this.board.corners, c => c.score).score;

    return [standardDeviation + highestCorner * 0.2, {standardDeviation, highestCorner}];
  }

  private generateSingleBoard(spec: BoardSpec): Board {
    const board = new Board(spec);
    if (this.options.shufflePorts) {
      shufflePorts(board);
    }

    // Place all of the resource hexes. This function can fail, so its run in a loop until it
    // succeeds. Place hexes also places a few roll numbers.
    do {
      this.remainingNumbers = sortBy(spec.rollNumbers(), n => getNumDots(n));
      this.remainingResources = new RandomQueue(spec.resources());
      this.initialResources = new RandomQueue(USABLE_RESOURCES);
      board.reset();
    } while (!this.placeHexes(board));

    this.board = board;

    this.remainingHexes = board.hexes.filter(
        hex => hex.resource !== ResourceType.DESERT && !hex.rollNumber);
    assert(this.remainingHexes.length === this.remainingNumbers.length);

    // Place the roll numbers until there are none left.
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
    // First place the desert.
    this.placeDesert(board);

    // Next ensure that there's at least 1 red roll number that is inland.
    // Without this part, it's common that all red numbers are coastal, and that's less fun.
    const inlandHex = sample(board.hexes.filter(h => !h.resource && !isCoastal(h)));
    inlandHex.resource = this.initialResources.pop();
    inlandHex.rollNumber = this.remainingNumbers.pop();
    this.remainingResources.remove(inlandHex.resource);

    // Next place one of each resource and a corresponding high number such that each of these
    // high numbers are not touching each other. This ensures every resource has at least one
    // good roll number.
    let resource: ResourceType;
    // tslint:disable-next-line:no-conditional-assignment
    while (resource = this.initialResources.pop()) {
      const availableHexes = board.hexes.filter(h =>
          !h.resource &&
          !h.getPortResources().includes(resource) &&
          !h.getNeighbors().find(neighbor => !!neighbor.resource));
      if (!availableHexes.length) {
        return false;
      }
      const hex = sample(availableHexes);
      hex.resource = resource;
      hex.rollNumber = this.remainingNumbers.pop();
      this.remainingResources.remove(resource);
    }

    // Next set the resources on hexes with typed ports such that they don't have their matching
    // resource.
    const hexesWithTypedPorts = board.hexes.filter(hex =>
        !hex.resource &&
        hex.getPortResources().filter(r => r !== ResourceType.ANY).length);
    for (const hex of hexesWithTypedPorts) {
      const excludeResources = hex.getPortResources().slice();
      if (this.options.resourceDistribution === ResourceDistribution.EVEN) {
        excludeResources.push(...hex.getNeighborResources());
      }
      hex.resource = this.remainingResources.popExcluding(...excludeResources);
      if (!hex.resource) {
        return false;
      }
    }

    // Now set all remaining hexes at random, but without any of the same resources touching itself.
    // If we are unable to replace a hex without it touching the same resource type, return false
    // so that the function can be ran again on a new board.
    for (const hex of board.hexes) {
      if (hex.resource) {
        continue;
      }
      if (this.options.resourceDistribution === ResourceDistribution.EVEN) {
        resource = this.remainingResources.popExcluding(...hex.getNeighborResources());
      } else {
        // resourceDistribution === ResourceDistribution.RANDOM
        resource = this.remainingResources.pop();
      }
      if (!resource) {
        return false;
      }
      hex.resource = resource;
    }
    return true;
  }

  placeDesert(board: Board) {
    if (this.desertPlacement === DesertPlacement.CENTER) {
      const coords = this.getCenterCoords(board);
      for (const coord of coords) {
        this.remainingResources.remove(ResourceType.DESERT);
        board.hexGrid[coord.y][coord.x].resource = ResourceType.DESERT;
      }
      assert(this.remainingResources.filterBy(ResourceType.DESERT).isEmpty());
    }

    let availableHexes: Hex[];
    switch (this.desertPlacement) {
      case DesertPlacement.RANDOM:
        // Don't put the desert on a hex that has a 2 typed ports.
        availableHexes = board.hexes.filter(hex => !has2TypedPorts(hex));
        break;

      case DesertPlacement.OFF_CENTER:
        const centerCoords = this.getCenterCoords(board);
        availableHexes = board.hexes.filter(hex =>
            !isCoastal(hex) && !centerCoords.find(c => hex.hasCoordinate(c)));
        break;

      case DesertPlacement.COAST:
        availableHexes = board.hexes.filter(hex =>
            isCoastal(hex) && !has2TypedPorts(hex));
        break;
    }

    while (this.remainingResources.remove(ResourceType.DESERT)) {
      const hex = sample(availableHexes);
      assert(hex);
      hex.resource = ResourceType.DESERT;
    }
  }

  private getCenterCoords(board: Board): Coordinate[] {
    const width = board.dimensions.width;
    const y = Math.floor(board.dimensions.height / 2);
    if (width % 2 === 0) {
      const half = width / 2 + 1;
      return [{x: half, y}, {x: half + 2, y}];
    } else {
      return [{x: Math.ceil(width / 2) + 1, y}];
    }
  }

  /**
   * Scores every corner and every hex of the board, then places the highest available number of the
   * lowest valued hex.
   */
  private placeNumber() {
    this.scoreHexesAndCorners();

    const hex = sample(findAllLowestBy(this.remainingHexes, h => h.score));
    pull(this.remainingHexes, hex);

    hex.rollNumber = this.remainingNumbers.pop();
  }

  /**
   * Computes a score for every corner of the board based on the value of each roll number/resource
   * at that corner and the presence of a port. Then computes the value of each hex but summing the
   * corners of that hex.
   */
  private scoreHexesAndCorners(balanceCoastAndDesert = false) {
    const nextNumDots = this.remainingNumbers.length ?
        getNumDots(last(this.remainingNumbers)) : 0;

    // First score every corner by evaluating how good of a spot that specific corner is.
    for (const corner of this.board.corners) {
      const hexes = corner.getHexes();
      // Sum the value of each neighboring hex.
      let score = sumBy(hexes, hex =>
          this.getResourceValue(hex.resource) * this.getRollNumValue(hex.rollNumber, nextNumDots));

      // If balanceCoastAndDesert is set, pretend like the corner always has 3 resourced hexes where
      // the rollNumber is a bad number.
      if (balanceCoastAndDesert) {
        const nonDesertHexes = hexes.filter(h => h.resource !== ResourceType.DESERT);
        if (nonDesertHexes.length < 3) {
          score += (3 - nonDesertHexes.length) *
              this.getResourceValue(ResourceType.BRICK) * this.getRollNumValue(2, nextNumDots);
        }
      }
      const notes = [];
      if (corner.port) {
        notes.push(['Has port']);
        score += 3;
      }

      // Look for any good combinations.
      const resourceOdds = this.computeRollOddsPerResource(hexes, nextNumDots);
      const addCombo = (name: string, multiplier: number, ...resources: ResourceType[]) => {
        if (hasAll(resourceOdds, ...resources)) {
          const addition = sumByKey(resourceOdds, ...resources) * 0.05 * multiplier;
          notes.push(name + ' corner: ' + round(addition, 2));
          score += addition;
        }
      };
      addCombo('City', 3, ResourceType.WHEAT, ResourceType.ORE);
      addCombo('Road', 2.5, ResourceType.BRICK, ResourceType.WOOD);
      corner.notes = notes.join('\n');
      corner.score = score;
    }

    for (const hex of this.board.hexes) {
      const sumOfCorners = sumBy(hex.getCorners(),
          corner => Math.pow(corner.score, HEX_CORNER_POWER));
      hex.score = sumOfCorners;
    }
  }

  private computeRollOddsPerResource(hexes: Hex[], defaultRollScore: number): Map<ResourceType, number> {
    const map = new Map();
    for (const hex of hexes) {
      if (hex.resource === ResourceType.DESERT) {
        continue;
      }
      let num = this.getRollNumValue(hex.rollNumber, defaultRollScore);
      if (map.has(hex.resource)) {
        num += map.get(hex.resource);
      }
      map.set(hex.resource, num);
    }
    return map;
  }

  private getResourceValue(resource: ResourceType): number {
    assert(resource);
    return resource === ResourceType.DESERT ? 0 : 1;
  }

  private getRollNumValue(rollNumber: number, missingValue = 0): number {
    return rollNumber ? getNumDots(rollNumber) : missingValue;
  }

  /**
   * If DesertPlaceement.RANDOM && BoardShape.STANDARD, picks one of the other options and random
   * and returns that.
   */
  private chooseDesertPlacement(spec: BoardSpec): DesertPlacement {
    if (this.options.desertPlacement === DesertPlacement.RANDOM &&
        spec.shape === BoardShape.STANDARD) {
      const rand = Math.random();
      if (rand < 0.2) {
        return DesertPlacement.CENTER;
      } else if (rand < 0.6) {
        return DesertPlacement.COAST;
      } else {
        return DesertPlacement.OFF_CENTER;
      }
    } else {
      return this.options.desertPlacement;
    }
  }
}

function has2TypedPorts(hex: Hex): boolean {
  return hex.getCorners().filter(
      c => c.port && c.port.resource !== ResourceType.ANY).length === 2;
}

function isCoastal(hex: Hex): boolean {
  return hex.getNeighbors().length < 6;
}
