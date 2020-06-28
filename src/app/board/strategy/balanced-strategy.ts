import { Board, BoardSpec, ResourceType, Hex, getNumDots, USABLE_RESOURCES, Coordinate } from '../board';
import { Strategy, StrategyOptions, DesertPlacement, ResourceDistribution, shufflePorts } from './strategy';
import { assert } from 'src/app/util/assert';
import { RandomQueue } from '../random-queue';
import { findAllLowestBy, hasAll, sumByKey, findHighestBy, findAllHighestBy } from 'src/app/util/collections';
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

const LOW_SCORE = 1.5;
const HIGH_SCORE = 3.9;

let firstGenerated = false;

export class BalancedStrategy implements Strategy {
  readonly name = 'Balanced';

  private desertPlacement: DesertPlacement;

  private remainingHexes: Hex[];
  // Sorted by how good the number is.
  private remainingNumbers: number[];
  private remainingResources: RandomQueue<ResourceType>;
  private board: Board;
  private initialResources: RandomQueue<ResourceType>;
  private targetScore: number;

  constructor(readonly options: StrategyOptions) {
    // options.numberDistribution is given as a number between 0 and 1, where
    // 1 = very evenly distrubited (communism)
    // 0 = very uneven (capitalism)
    // Below we convert the point on that line to an equivalent score.
    // LOW_SCORE ~= communism, HIGH_SCORE ~= capitalism
    this.targetScore =
        (1 - options.numberDistribution) * (HIGH_SCORE - LOW_SCORE) + LOW_SCORE;
    console.log('target score: ' + this.targetScore);
  }

  generateBoard(spec: BoardSpec): Board {
    // Because we randomly generate N boards and pick the best one, the scoring can bias towards a
    // specific desert placement. To counteract this, we decide the desert placement up front.
    this.desertPlacement = this.chooseDesertPlacement(spec);

    // Each board is randomly generated with a best effort. We generate several boards and return
    // the best one.
    let bestBoard: Board;
    let bestBoardScore = Number.MAX_VALUE;
    let bestBoardScoreStats;
    const startTime = Date.now();
    const minTime = firstGenerated ? MIN_TIME : FIRST_MIN_TIME;
    let i = 0;
    for (i = 0; i < MIN_ATTEMPTS || Date.now() - startTime < minTime; i++) {
      this.board = this.generateSingleBoard(spec);
      const [score, stats] = this.scoreBoard();
      if (this.isBetterScore(bestBoardScore, score)) {
        bestBoard = this.board;
        bestBoardScore = score;
        bestBoardScoreStats = stats;
      }
    }
    console.log('num boards generated: ' + i);
    console.log('Board score: ' + bestBoardScore);
    console.log(bestBoardScoreStats);

    firstGenerated = true;
    return bestBoard;
  }

  private isBetterScore(previous: number|null, next: number): boolean {
    if (previous === null) {
      return true;
    }
    const previousDistance = Math.abs(previous - this.targetScore);
    const nextDistance = Math.abs(next - this.targetScore);
    return nextDistance < previousDistance;
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

    return [standardDeviation, {standardDeviation, highestCorner}];
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

    // Numbers are placed in order from best number to worst.
    // Start by placing the best available numbers on at least one of each resource type.
    // This is just to make sure there's at least 1 good number per resource.

    // When generating a "communism" board, good numbers tend to naturally end up on the beach.
    // Ensure there's at least 1 good inland number.
    const inlandHex = sample(
        this.remainingHexes.filter(h => h.resource !== ResourceType.DESERT && !isCoastal(h)));
    inlandHex.rollNumber = this.remainingNumbers.pop();
    this.initialResources.remove(inlandHex.resource);
    pull(this.remainingHexes, inlandHex);

    let resource;
    // tslint:disable-next-line:no-conditional-assignment
    while (resource = this.initialResources.pop()) {
      this.placeNumber(resource);
    }

    // Place the remaining roll numbers until there are none left.
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

    const resourceDistributionQueue = this.getResourceDistrubitionQueue();

    // Next set the resources on hexes with typed ports such that they don't have their matching
    // resource.
    const hexesWithTypedPorts = board.hexes.filter(hex =>
        !hex.resource &&
        hex.getPortResource() &&
        hex.getPortResource() !== ResourceType.ANY);
    for (const hex of hexesWithTypedPorts) {
      const strategy = resourceDistributionQueue.pop();
      let possibleResources = this.remainingResources.filter(r => r !== hex.getPortResource());
      const neighborResources = hex.getNeighborResources().filter(r => r !== ResourceType.DESERT);
      if (neighborResources.length) {
        if (strategy === ResourceDistribution.CLUMPED) {
          const possible2 = possibleResources.filter(r => neighborResources.includes(r));
          if (possible2.length) {
            possibleResources = possible2;
          }
        } else {
          possibleResources = possibleResources.filter(r => !neighborResources.includes(r));
        }
      }
      hex.resource = possibleResources.pop();
      if (!hex.resource) {
        console.log('!!!! returning');
        return false;
      }
      this.remainingResources.remove(hex.resource);
    }

    // Now set all remaining hexes at random, but without any of the same resources touching itself.
    // If we are unable to replace a hex without it touching the same resource type, return false
    // so that the function can be ran again on a new board.
    for (const hex of board.hexes) {
      if (hex.resource) {
        continue;
      }
      let resource: ResourceType;
      const strategy = resourceDistributionQueue.pop();
      if (strategy === ResourceDistribution.EVEN) {
        resource = this.remainingResources.popExcluding(...hex.getNeighborResources());
      } else {
        // strategy === ResourceDistribution.CLUMPED
        const neighborResources = hex.getNeighborResources();
        if (neighborResources.length) {
          resource = this.remainingResources.popOneOf(...hex.getNeighborResources());
        }
        if (!resource) {
          resource = this.remainingResources.pop();
        }
      }
      if (!resource) {
        // Strategy failed, just take one at random.
        console.log('returning2!!!');
        return false;
      }
      hex.resource = resource;
    }
    return true;
  }

  getResourceDistrubitionQueue(): RandomQueue<ResourceDistribution> {
    const queue = new RandomQueue<ResourceDistribution>();
    const numEven = Math.floor(this.options.resourceDistribution * this.remainingResources.length);
    for (let i = 0; i < numEven; i++) {
      queue.push(ResourceDistribution.EVEN);
    }
    for (let i = numEven; i < this.remainingResources.length; i++) {
      queue.push(ResourceDistribution.CLUMPED);
    }
    return queue;
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
  private placeNumber(resourceType: null|ResourceType = null) {
    this.scoreHexesAndCorners();

    let potentialHexes = this.remainingHexes;
    if (resourceType) {
      potentialHexes = potentialHexes.filter(h => h.resource === resourceType);
    }

    if (this.options.numberDistribution === 1) {
      potentialHexes = findAllLowestBy(potentialHexes, h => h.score);
    } else if (this.options.numberDistribution === 0) {
      potentialHexes = findAllHighestBy(potentialHexes, h => h.score);
    } else {
      sortBy(potentialHexes, h => h.score);
      const targetIndex =
          Math.floor((1 - this.options.numberDistribution) * potentialHexes.length);
      potentialHexes = [potentialHexes[targetIndex]];
    }
    const hex = sample(potentialHexes);
    pull(this.remainingHexes, hex);

    hex.rollNumber = this.remainingNumbers.pop();
  }

  /**
   * Computes a score for every corner of the board based on the value of each roll number/resource
   * at that corner and the presence of a port. Then computes the value of each hex but summing the
   * corners of that hex.
   */
  private scoreHexesAndCorners(balanceCoastAndDesert = false) {
    // First score every corner by evaluating how good of a spot that specific corner is.
    for (const corner of this.board.corners) {
      const hexes = corner.getHexes();
      // Sum the value of each neighboring hex.
      let score = sumBy(hexes, hex =>
          this.getResourceValue(hex.resource) * this.getRollNumValue(hex.rollNumber, 0));

      // If balanceCoastAndDesert is set, pretend like the corner always has 3 resourced hexes where
      // the rollNumber is a bad number.
      if (balanceCoastAndDesert) {
        const nonDesertHexes = hexes.filter(h => h.resource !== ResourceType.DESERT);
        if (nonDesertHexes.length < 3) {
          score += (3 - nonDesertHexes.length) *
              this.getResourceValue(ResourceType.BRICK) * this.getRollNumValue(2, 0);
        }
      }
      const notes = [];
      if (corner.port) {
        notes.push(['Has port']);
        score += 3;
      }

      // Look for any good combinations.
      const resourceOdds = this.computeRollOddsPerResource(hexes, 0);
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
