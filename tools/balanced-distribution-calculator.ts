/**
 * In order to provide the "Number Distribution" slider, we must know what the min and
 * max score values are for each strategy. This file is for generating that data.
 * 
 * Run this by calling calculateStrategyScores() from your browser console.
 * Seriously? Yes. Unfortuntely, I couldn't figure out how to let you run this as a
 * stand-alone node script, because everything has to be difficult.
 * 
 * This works by generating a large number of totally "greedy" and totally "fair" boards
 * to determine the average value for each of those. This lets us treat those as min/max
 * values when determing what the target score of 60% between "greedy" and "fair" should be.
 * 
 * We know the target score for totally "greedy" and "fair" implicitly because we use
 * "0" and "infinity" respectively.
 */
import { mean } from "lodash-es";
import { BOARD_SPECS } from "../src/app/board/board-specs";
import { BalancedStrategy } from "../src/app/board/strategy/balanced-strategy";
import { DesertPlacement } from "../src/app/board/strategy/strategy";
import { shapeLabelToEnumName } from "src/app/board/specs/shapes-enum";

function createBalancedStrategy(numberDistribution: number): BalancedStrategy {
  return new BalancedStrategy({desertPlacement: DesertPlacement.RANDOM,
    resourceDistribution: 1,
    numberDistribution,
    shufflePorts: false,
    allowResourceOnPort: true})
}

const greedyStrategy = createBalancedStrategy(0);
const fairStrategy = createBalancedStrategy(1);

export function calculateStrategyScores() {
  let output = '';
  for (const [shapeLabel, boardSpec] of Object.entries(BOARD_SPECS)) {
    const distributions = {
      fair: {
        strategy: fairStrategy,
        score: 0,
      },
      greedy: {
        strategy: greedyStrategy,
        score: 0,
      }
    }
    for (const distribution of Object.values(distributions)) {
      const values = [];
      for (let i = 0; i < 20; i++) {
        const {score} = distribution.strategy.generateBoard(boardSpec);
        values.push(score);
      }
      distribution.score = mean(values);
    }
    const shapeName = shapeLabelToEnumName(shapeLabel);
    output += `  [BoardShape.${shapeName}]: { greedy: ${distributions.greedy.score
        }, fair: ${distributions.fair.score} },\n`;
  }
  console.log('\n\n\n\n');
  console.log(output);
}
