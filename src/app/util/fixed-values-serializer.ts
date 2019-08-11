/**
 * @fileoverview FixedValuesSerializer is used to serialize a list of limited values to a lower
 * alpha-numeric string. This is used for efficiently serializing a list of enums to a URL.
 *
 * Serialization follows these steps.
 * 1. Convert the input values to integers from 1 to N, where N is the number of possible values.
 *    Any instances of undefined or null in the input is set to 0.
 * 2. Combine the numbers from step 1 into a single number. This is done by creating a base N number
 *    where each "digit" is a value from step 1. If the base N number is > Number.MAX_SAFE_INTEGER,
 *    multiple base N numbers are generated. These generated values are called "blocks". Note that
 *    the max is technically MAX_BLOCK_INTEGER.
 * 3. For each block from step 2, convert the block to a 10 character base 36 string. A base36
 *    string is lower alpha-numeric characters. The last number may be less than 10 characters,
 *    since deserialization can infer the last characters.
 * 4. Concat the strings from step 3.
 */
import { assert } from './assert';

import padStart from 'lodash/padStart';

// A block is a group of 10 base 36 characters. 10 digits is the largest base36 number without going
// over Number.MAX_SAFE_INTEGER. FixedValuesSerializer serializes data into groups of 10 characters
const BLOCK_SIZE = 10;
const MAX_BLOCK_INTEGER = Math.pow(36, BLOCK_SIZE);

/**
 * Serializes and deserializes a list into a base 36 string where the list of entries has a fixed
 * number of possible values. See the fileoverview for more details.
 */
export class FixedValuesSerializer<V> {
  private readonly valuesPerBlock: number;
  private readonly setSize: number;
  private readonly setBase: number;

  /**
   * @param valueSet The possibe values that can be provided to serialize.
   */
  constructor(private readonly valueSet: V[]) {
    this.setSize = valueSet.length;
    this.setBase = this.setSize + 1;
    assert(this.setBase < 36);

    // Calculate how many values can fit into 10 base 36 characters.
    let valuesPerBlock = 0;
    let n = this.setSize;
    while (n < MAX_BLOCK_INTEGER) {
      valuesPerBlock++;
      n *= this.setSize;
    }
    this.valuesPerBlock = valuesPerBlock - 1;
  }

  serialize(values: Array<V|null|undefined>): string {
    const valueNums = this.convertToNumbers(values);
    const blockNums = this.convertToBlockNumbers(valueNums);
    return blockNums.map((num, index) => {
      let str = num.toString(36);
      // For all blocks besides the last, the block needs to be exactly BLOCK_SIZE characters long.
      if (index < blockNums.length - 1) {
        str = padStart(str, BLOCK_SIZE, '0');
      }
      return str;
    }).join('');
  }

  /**
   * Converts values to integers where null|undefined is 0 and values are their index in
   * valueSet + 1.
   */
  private convertToNumbers(values: Array<V|null|undefined>): number[] {
    return values.map(v => {
      if (v === null || v === undefined) {
        return 0;
      }
      const i = this.valueSet.indexOf(v);
      assert(i > -1, 'Unrecognized value ' + v);
      return i + 1;
    });
  }

  /**
   * Packs groups of valueNums into numbers < MAX_BLOCK_INTEGER. This is done by essentially
   * generating a base setSize number where each 'digit' is an entry in valueNums.
   * @param valueNums Numbers between [0, setSize).
   */
  private convertToBlockNumbers(valueNums: number[]): number[] {
    const blockNumbers: number[] = [];
    let currentBlock = 0;
    let digit = 0;
    function appendCurrent() {
      assert(currentBlock < MAX_BLOCK_INTEGER);
      blockNumbers.push(currentBlock);
      currentBlock = 0;
      digit = 0;
    }

    for (const valueNum of valueNums) {
      currentBlock += valueNum * Math.pow(this.setBase, digit);
      digit++;
      if (digit >= this.valuesPerBlock) {
        appendCurrent();
      }
    }
    if (digit > 0) {
      // The last block wasn't a full set of values.
      appendCurrent();
    }
    return blockNumbers;
  }

  deserialize(value: string): Array<V|undefined> {
    const values: Array<V|undefined> = [];
    for (let i = 0; i < value.length; i += BLOCK_SIZE) {
      const block = value.substr(i, BLOCK_SIZE);
      const blockNumber = parseInt(block, 36);
      const valueNums = baseNEncode(blockNumber, this.setBase);
      assert(valueNums.length <= this.valuesPerBlock);

      for (let j = valueNums.length - 1; j >= 0; j--) {
        values.push(this.numToValue(valueNums[j]));
      }
      // If we're not on the last block, but we didn't extract valuesPerBlock, that means the
      // values at the end of the block are undefined. We don't do this for the lastBlock because
      // undefineds at the end of the list are ignored.
      const isLastBlock = i + BLOCK_SIZE >= value.length;
      if (!isLastBlock) {
        for (let j = valueNums.length; j < this.valuesPerBlock; j++) {
          values.push(undefined);
        }
      }
    }
    return values;
  }

  private numToValue(num: number): V|undefined {
    assert(num >= 0 && num <= this.setSize, 'unexpected value number ' + num);
    if (num === 0) {
      return undefined;
    }
    return this.valueSet[num - 1];
  }
}

function baseNEncode(num: number, base: number): number[] {
  const values: number[] = [];
  while (num > 0) {
    const digit = num % base;
    values.unshift(digit);
    num = Math.floor(num / base);
  }
  return values;
}
