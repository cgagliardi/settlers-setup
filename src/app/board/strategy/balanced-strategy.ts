import { Board, BoardSpec, ResourceType, Hex, getNumDots, GameStyle, USABLE_RESOURCES, Coordinate } from '../board';
import { Strategy, StrategyOptions, DesertPlacement, ResourceDistribution } from './strategy';
import * as _ from 'lodash';
import { assert } from 'src/app/util/assert';
import { RandomQueue } from '../random-queue';
import { findAllLowestBy, findLowestBy, hasAll, sumByKey, findHighestBy } from 'src/app/util/collections';

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
    this.desertPlacement = this.chooseDesertPlacement();

    // The algorithm in this class isn't great. So to compensate, we genrate 20 boards, and return
    // the best one.
    let bestBoard: Board;
    let lowestScore = Number.MAX_VALUE;
    for (let i = 0; i < 25; i++) {
      const board = this.generateSingleBoard(spec);
      const score = this.scoreBoard(board);
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
  private scoreBoard(board: Board): number {
    this.scoreHexesAndCorners(true /* balanceCoastAndDesert */);

    // Compute the variance of the corner scores.
    const scores = board.corners.map(c => c.score);
    const mean = _.mean(scores);
    const sum = _.sum(scores.map(s => Math.pow(mean - s, 2)));
    return sum / board.corners.length;
  }

  private generateSingleBoard(spec: BoardSpec): Board {
    // Place all of the resource hexes. This function can fail, so its run in a loop until it
    // succeeds. Place hexes also places a few roll numbers.
    let board: Board;
    do {
      this.remainingNumbers = _.sortBy(spec.rollNumbers(), n => getNumDots(n));
      this.remainingResources = new RandomQueue(spec.resources());
      this.initialResources = new RandomQueue(USABLE_RESOURCES);
      if (!board) {
        board = new Board(spec);
      } else {
        board.reset();
      }
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
    const inlandHex = _.sample(board.hexes.filter(h => !h.resource && !isCoastal(h)));
    inlandHex.resource = this.initialResources.pop();
    inlandHex.rollNumber = this.remainingNumbers.pop();

    // Next place one of each resource and a corresponding high number such that each of these
    // high numbers are not touching each other. This ensures every resource has at least one
    // good roll number.
    let resource: ResourceType;
    while (resource = this.initialResources.pop()) {
      const availableHexes = board.hexes.filter(h =>
          !h.resource &&
          !h.getPortResources().includes(resource) &&
          !h.getNeighbors().find(neighbor => !!neighbor.resource));
      if (!availableHexes.length) {
        return false;
      }
      const hex = _.sample(availableHexes);
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
      const excludeResources = hex.getPortResources();
      if (this.options.resourceDistribution === ResourceDistribution.EVEN) {
        excludeResources.push(...hex.getNeighborResources());
      }
      hex.resource = this.remainingResources.popExcluding(...excludeResources);
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
        if (!resource) {
          return false;
        }
      } else {
        // resourceDistribution === ResourceDistribution.RANDOM
        resource = this.remainingResources.pop();
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
      const hex = _.sample(availableHexes);
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

    const hex = _.sample(findAllLowestBy(this.remainingHexes, h => h.score));
    _.pull(this.remainingHexes, hex);

    hex.rollNumber = this.remainingNumbers.pop();
  }

  /**
   * Computes a score for every corner of the board based on the value of each roll number/resource
   * at that corner and the presence of a port. Then computes the value of each hex but summing the
   * corners of that hex.
   */
  private scoreHexesAndCorners(balanceCoastAndDesert = false) {
    const nextNumDots = this.remainingNumbers.length ?
        getNumDots(_.last(this.remainingNumbers)) : 0;

    // First score every corner by evaluating how good of a spot that specific corner is.
    for (const corner of this.board.corners) {
      const hexes = corner.getHexes();
      // Sum the value of each neighboring hex.
      let score = _.sumBy(hexes, hex =>
          this.getResourceValue(hex.resource) * this.getRollNumValue(hex.rollNumber, nextNumDots));

      // If balanceCoastAndDesert is set, pretend like the corner always has 3 resourced hexes where
      // the rollNumber is an average roll number.
      if (balanceCoastAndDesert) {
        const nonDesertHexes = hexes.filter(h => h.resource !== ResourceType.DESERT);
        if (nonDesertHexes.length < 3) {
          score += (3 - nonDesertHexes.length) *
              this.getResourceValue(ResourceType.BRICK) * this.getRollNumValue(4, nextNumDots);
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
          const addition = sumByKey(resourceOdds, ...resources) * 0.1 * multiplier;
          notes.push(name + ' corner: ' + _.round(addition, 2));
          score += addition;
        }
      };
      addCombo('City', 3, ResourceType.WHEAT, ResourceType.ORE);
      addCombo('Road', 2.5, ResourceType.BRICK, ResourceType.WOOD);
      if (this.options.gameStyle === GameStyle.STANDARD) {
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
                   this.getRollNumValue(hex.rollNumber, 0), nextNumDots);
      hex.score = sumOfCorners * hexMultiplier;
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
    if (resource === ResourceType.DESERT) {
      return 0;
    }
    switch (this.options.gameStyle) {
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

  private getRollNumValue(rollNumber: number, missingValue = 0): number {
    return rollNumber ? getNumDots(rollNumber) : missingValue;
  }

  /**
   * If the DesertPlaceement is set to RANDOM, picks one of the other options and random and returns
   * that.
   */
  private chooseDesertPlacement(): DesertPlacement {
    if (this.options.desertPlacement === DesertPlacement.RANDOM) {
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
