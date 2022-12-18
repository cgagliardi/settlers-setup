/**
 * @fileoverview Contains the specification for each supported Catan board.
 */

import { BoardSpec } from './board';
import { BoardShape } from './specs/shapes-enum';
import { STANDARD } from './specs/standard';
import { SEAFARERS1 } from './specs/seafarers-1';
import { SEAFARERS2 } from './specs/seafarers-2';
import { EXPANSION6 } from './specs/expansion-6';
import { DRAGONS } from './specs/dragons';

export const BOARD_SPECS: { readonly [key in BoardShape]: BoardSpec } = {
  [BoardShape.STANDARD]: STANDARD,
  [BoardShape.EXPANSION6]: EXPANSION6,
  [BoardShape.SEAFARERS1]: SEAFARERS1,
  [BoardShape.SEAFARERS2]: SEAFARERS2,
  [BoardShape.DRAGONS]: DRAGONS,
};

/**
 * These are used to encode the shape in the URL as a single character. The values below must be
 * unique.
 */
export const SHAPE_URL_KEYS: {readonly [key in BoardShape]: string} = {
  [BoardShape.STANDARD]: 's',
  [BoardShape.EXPANSION6]: 'e',
  [BoardShape.SEAFARERS1]: '1',
  [BoardShape.SEAFARERS2]: '2',
  [BoardShape.DRAGONS]: 'd',
};
