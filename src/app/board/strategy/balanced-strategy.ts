import { Board, BoardSpec, ResourceType, Hex, getNumDots, STANDARD_RESOURCES, Coordinate } from '../board';
import { Strategy, StrategyOptions, DesertPlacement, ResourceDistribution, shufflePorts } from './strategy';
import { assert } from 'src/app/util/assert';
import { RandomQueue } from '../random-queue';
import { findAllLowestBy, hasAll, sumByKey, findHighestBy, countMatches, findAllHighestBy } from 'src/app/util/collections';

import { mean, pull, round, sample, sortBy, sum, sumBy, countBy } from 'lodash-es';
import { BoardShape } from '../specs/shapes-enum';

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

enum NumberPlacement {
  GREEDY = 0,
  FAIR = 1,
}

/**
 * These values allow us to generate boards with a specific numberDistribution.
 * Any time the algorithm is modified or new boards are added, this should be updated
 * with new values. To generate this list, call calculateStrategyScores() from
 * the browser console.
 */
const SCORE_RANGES = {
  [BoardShape.STANDARD]: { greedy: 13.014067729766802, fair: 5.893507115912209 },
  [BoardShape.EXPANSION6]: { greedy: 15.854644082031252, fair: 5.459049609374999 },
  [BoardShape.SEAFARERS1]: { greedy: 22.19497916666667, fair: 7.765675357938958 },
  [BoardShape.SEAFARERS2]: { greedy: 16.912793885030865, fair: 11.232163108710564 },
  [BoardShape.DRAGONS]: { greedy: 22.21849821428571, fair: 11.630966830357144 },
};

function createRandomQueueByPercent<T>(
      percent: number, size: number, lowValue: T, highValue: T): RandomQueue<T> {
  const queue = new RandomQueue<T>();
  const numHigh = Math.floor(percent * size);
  for (let i = 0; i < numHigh; i++) {
    queue.push(highValue);
  }
  for (let i = numHigh; i < size; i++) {
    queue.push(lowValue);
  }
  return queue;
}

export class BalancedStrategy implements Strategy {
  readonly name = 'Balanced';

  private desertPlacement!: DesertPlacement;

  private remainingHexes!: Hex[];
  // Sorted by how good the number is.
  private remainingNumbers!: number[];
  private remainingResources!: RandomQueue<ResourceType>;
  private board!: Board;
  private initialResources!: RandomQueue<ResourceType>;
  private targetScore!: number;

  constructor(readonly options: StrategyOptions) {}

  generateBoard(spec: BoardSpec): { board: Board, score: number } {
    this.targetScore = this.calculateTargetScore(spec);
    // Because we randomly generate N boards and pick the best one, the scoring can bias towards a
    // specific desert placement. To counteract this, we decide the desert placement up front.
    this.desertPlacement = this.chooseDesertPlacement(spec);

    // Each board is randomly generated with a best effort. We generate several boards and return
    // the best one.
    let bestBoard: Board;
    let bestBoardScore: number|null = null;
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
    console.log('Target score: ' + this.targetScore);
    console.log('Board score: ' + bestBoardScore);
    console.log(bestBoardScoreStats);

    firstGenerated = true;
    return { board: bestBoard!, score: bestBoardScore! };
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
  private scoreBoard(): [number, {variance: number, highestCorner: number}] {
    // Compute the variance of the corner scores.
    this.scoreHexesAndCorners(true /* balanceCoastAndDesert */);
    const scores = this.board.corners.map(c => c.score);
    const scoreMean = mean(scores);
    const scoreSum = sum(scores.map(s => Math.pow(scoreMean - s!, 2)));
    const variance = scoreSum / this.board.corners.length;

    this.scoreHexesAndCorners(false /* balanceCoastAndDesert */);
    const highestCorner = findHighestBy(this.board.corners, c => c.score!)!.score!;
    return [variance + (highestCorner - 10), {variance, highestCorner}];
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
      this.initialResources =
          new RandomQueue(STANDARD_RESOURCES.filter(r => this.remainingResources.includes(r)));
      board.reset();
    } while (!this.placeHexes(board));

    this.board = board;
    this.remainingHexes = board.mutableHexes.filter(
        hex =>
            hex.resource !== ResourceType.DESERT
            && !hex.rollNumber);
    assert(this.remainingHexes.length === this.remainingNumbers.length);

    // Numbers are placed in order from best number to worst.
    // Start by placing the best available numbers on at least one of each resource type.
    // This is just to make sure there's at least 1 good number per resource.

    // Good numbers tend to naturally end up on the beach.
    // Ensure there's at least 1 good inland number.
    if (!board.spec.allCoastalHexes) {
      const inlandHex = sample(this.remainingHexes.filter(h => !isCoastal(h)))!;
      inlandHex.rollNumber = this.remainingNumbers.pop()!;
      this.initialResources.remove(inlandHex.resource!);
      pull(this.remainingHexes, inlandHex);
    }

    let resource;
    const numberStrategies = createRandomQueueByPercent(
        this.options.numberDistribution, this.remainingHexes.length,
        NumberPlacement.GREEDY, NumberPlacement.FAIR);
    // tslint:disable-next-line:no-conditional-assignment
    while (resource = this.initialResources.pop()) {
      this.placeNumber(numberStrategies.pop()!, resource);
    }

    // Place the remaining roll numbers until there are none left.
    while (this.remainingHexes.length) {
      this.placeNumber(numberStrategies.pop()!);
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

    const resourceDistributionQueue = createRandomQueueByPercent(this.options.resourceDistribution,
        this.remainingResources.length, ResourceDistribution.CLUMPED, ResourceDistribution.EVEN);

    // Next set the resources on hexes with typed ports such that they don't have their matching
    // resource.
    if (!this.options.allowResourceOnPort) {
      const hexesWithTypedPorts =
          board.mutableHexes.filter(hex => !hex.resource && hex.getTypedPortResources()!.size);
      for (const hex of hexesWithTypedPorts) {
        const strategy = resourceDistributionQueue.pop();
        let possibleResources =
            this.remainingResources.vals.filter(r => !hex.getTypedPortResources()!.has(r));
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
        if (!board.isResourceAllowed(hex, ResourceType.GOLD)) {
          possibleResources = possibleResources.filter(r => r !== ResourceType.GOLD);
        }
        const resource = sample(possibleResources);
        if (!resource) {
          return false;
        }
        hex.resource = resource;
        this.remainingResources.remove(hex.resource);
      }
    }

    // Now set all remaining hexes at random, but without any of the same resources touching itself.
    // If we are unable to replace a hex without it touching the same resource type, return false
    // so that the function can be ran again on a new board.
    this.remainingHexes = board.mutableHexes.filter(h => !h.resource);
    assert(this.remainingHexes.length === this.remainingResources.length);
    let resourceDistribution: ResourceDistribution|undefined;
    // tslint:disable-next-line:no-conditional-assignment
    while (resourceDistribution = resourceDistributionQueue.pop()) {
      let success: boolean;
      if (resourceDistribution === ResourceDistribution.CLUMPED) {
        success = this.placeResourceClumped(board);
      } else {
        success = this.placeResourceEven(board);
      }
      if (!success) {
        // Strategy failed.
        return false;
      }
      assert(this.remainingHexes.length === this.remainingResources.length);
      assert(this.remainingHexes.length === resourceDistributionQueue.length);
    }
    return true;
  }

  placeResourceClumped(board: Board): boolean {
    const availableResources = new Set(this.remainingResources.vals);
    const hasExistingResource =
        board.mutableHexes.findIndex(h => h.resource && availableResources.has(h.resource)) > -1;
    if (!hasExistingResource) {
      this.placeResourceRandom(board);
      return true;
    }
    // Find all of the hexes where we could place a clumped resource.
    const candidateHexes = this.remainingHexes.filter(h =>
        h.getNeighbors().findIndex(n => availableResources.has(n.resource!)) > -1);
    if (!candidateHexes.length) {
      return false;
    }
    const hex = sample(candidateHexes)!;
    const candidateResources =
        hex.getNeighbors().filter(n => availableResources.has(n.resource!)).map(n => n.resource);
    const resource = sample(candidateResources)!;
    // isResourceAllowed is used to decide when gold is allowed. Here we assume that a gold resource
    // can always be placed next to another gold resource.
    assert(board.isResourceAllowed(hex, resource));
    hex.resource = resource;
    this.remainingResources.remove(hex.resource);
    pull(this.remainingHexes, hex);
    return true;
  }

  placeResourceEven(board: Board): boolean {
    const hex = this.remainingHexes.pop()!;
    const bannedResources = hex.getNeighborResources();
    // Gold is only allowed on certain hexes.
    if (!board.isResourceAllowed(hex, ResourceType.GOLD)) {
      bannedResources.push(ResourceType.GOLD);
    }
    const resource = this.remainingResources.popExcluding(...bannedResources);
    if (!resource) {
      return false;
    }
    hex.resource = resource;
    return true;
  }

  placeResourceRandom(board: Board) {
    const hex = this.remainingHexes.pop()!;
    const bannedResources =
        board.isResourceAllowed(hex, ResourceType.GOLD) ? [ResourceType.GOLD] : [];
    hex.resource = this.remainingResources.popExcluding(...bannedResources)!;
  }

  placeDesert(board: Board) {
    if (this.desertPlacement === DesertPlacement.CENTER) {
      for (const hex of board.centerHexes) {
        this.remainingResources.remove(ResourceType.DESERT);
        hex.resource = ResourceType.DESERT;
      }
      assert(this.remainingResources.filterBy(ResourceType.DESERT).isEmpty());
      return;
    }

    let availableHexes: Hex[];
    availableHexes = board.mutableHexes.filter(hex => !hex.resource &&
        board.isResourceAllowed(hex, ResourceType.DESERT));
    switch (this.desertPlacement) {
      case DesertPlacement.RANDOM:
        // Don't put the desert on a hex that has a 2 typed ports.
        availableHexes = availableHexes.filter(hex => !has2TypedPorts(hex));
        break;

      case DesertPlacement.OFF_CENTER:
        const centerHexes = board.centerHexes;
        availableHexes = availableHexes.filter(hex =>
            !isCoastal(hex) && !centerHexes.includes(hex));
        break;

      case DesertPlacement.COAST:
        availableHexes = availableHexes.filter(hex =>
            isCoastal(hex) && !has2TypedPorts(hex));
        break;

      case DesertPlacement.INLAND:
        availableHexes = availableHexes.filter(hex => !isCoastal(hex));
        break;

      default:
        throw new Error('Unsupported desert placement: ' + this.desertPlacement);
    }

    while (this.remainingResources.remove(ResourceType.DESERT)) {
      const hex = sample(availableHexes);
      assert(hex);
      hex.resource = ResourceType.DESERT;
      pull(availableHexes, hex);
    }
  }

  /**
   * Scores every corner and every hex of the board, then places the highest available number of the
   * lowest valued hex.
   */
  private placeNumber(numberStrategy: NumberPlacement, resourceType: null|ResourceType = null) {
    this.scoreHexesAndCorners();

    let potentialHexes = this.remainingHexes;
    if (resourceType) {
      potentialHexes = potentialHexes.filter(h => h.resource === resourceType);
    }

    if (numberStrategy === NumberPlacement.FAIR) {
      potentialHexes = findAllLowestBy(potentialHexes, h => h.score!)!;
    } else {
      potentialHexes = findAllHighestBy(potentialHexes, h => h.score!)!;
    }
    const hex = sample(potentialHexes)!;
    pull(this.remainingHexes, hex);

    hex.rollNumber = this.remainingNumbers.pop()!;
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
          this.getResourceValue(hex.resource!) * this.getRollNumValue(hex.rollNumber!, 0));

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
        if (this.options.allowResourceOnPort) {
          const matchingReourceHexes =
              corner.getHexes().filter(h => h.resource === corner.port!.resource);
          if (matchingReourceHexes.length) {
            notes.push(['Has matching port']);
          }
          score += sum(
              matchingReourceHexes.map(hex => this.getRollNumValue(hex.rollNumber!, 2) * 0.3));
        }
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

    for (const hex of this.board.mutableHexes) {
      const sumOfCorners = sumBy(hex.getCorners(),
          corner => Math.pow(corner.score!, HEX_CORNER_POWER));
      hex.score = sumOfCorners;
    }
  }

  private computeRollOddsPerResource(hexes: Hex[], defaultRollScore: number): Map<ResourceType, number> {
    const map = new Map();
    for (const hex of hexes) {
      if (hex.resource === ResourceType.DESERT) {
        continue;
      }
      let num = this.getRollNumValue(hex.rollNumber!, defaultRollScore);
      if (map.has(hex.resource)) {
        num += map.get(hex.resource);
      }
      map.set(hex.resource, num);
    }
    return map;
  }

  private getResourceValue(resource: ResourceType): number {
    assert(resource);
    switch (resource) {
      case ResourceType.DESERT:
      case ResourceType.WATER:
        return 0;
      case ResourceType.GOLD:
        return 1.2;
      default:
        return 1;
    }
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

  private calculateTargetScore(spec: BoardSpec): number {
    switch (this.options.numberDistribution) {
      case 1:
        return Number.MAX_VALUE;
      case 0:
        return 0;
      default:
        const range = SCORE_RANGES[spec.shape];
        if (!range) {
          console.error(`score range missing for "${spec.shape}"`);
          return 0.5;
        }
        return (1 - this.options.numberDistribution) *
            (range.greedy - range.fair) + range.fair;
    }
  }
}

function has2TypedPorts(hex: Hex): boolean {
  return hex.getCorners().filter(
      c => c.port && c.port.resource !== ResourceType.ANY).length === 2;
}

function isCoastal(hex: Hex): boolean {
  return countMatches(hex.getNeighbors(),
      neighbor => neighbor.resource !== ResourceType.WATER) < 6;
}
