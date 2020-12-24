/**
 * @fileoverview Contains the specification for each supported Catan board.
 */

import { BoardSpec, Board, Hex, ResourceType, HexGrid, CoordinatePairs, Port } from './board';
import { assert } from 'src/app/util/assert';
import { BoardShape } from './specs/shapes-enum';
import { STANDARD } from './specs/standard';
import { SEAFARERS1 } from './specs/seafarers-1';
import { EXPANSION6 } from './specs/expansion-6';



export const BOARD_SPECS: { readonly [key in BoardShape]: BoardSpec } = {
  [BoardShape.STANDARD]: STANDARD,
  [BoardShape.EXPANSION6]: EXPANSION6,
  [BoardShape.SEAFARERS1]: SEAFARERS1,
};
