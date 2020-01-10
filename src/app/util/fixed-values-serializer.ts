/**
 * @fileoverview FixedValuesSerializer is used to serialize a list of limited values to a lower
 * alpha-numeric string. In order to serialize/deserialize a list, the list must be of a fixed size
 * with a fixed set of possible values. It must be known how much of each value will be in the
 * array.
 *
 * Serialization follows these steps.
 * 1. For each value, convert the value to integers from 1 to N, where N is the number of
 *    possible values. As it progresses through the input, N will decrease as the possible values
 *    remaining values descreases.
 * 2. Combine the numbers from step 1 into a single number. This is done by creating a base N number
 *    where each "digit" is a value from step 1. The base N actually changes per digit. For the
 *    first digit, it will be full set of possible values. However, as the list of possible values
 *    decreases (because there are none of such value left), the base of the higher digits
 *    decreases accordingly.
 *    If the generated number is > Number.MAX_SAFE_INTEGER, multiple numbers are generated. These
 *    generated values are called "blocks". Note that the max is technically MAX_BLOCK_INTEGER.
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
  /**
   * @param valueSet The possibe values that can be provided to serialize.
   */
  constructor(private readonly valueSet: V[]) {}

  serialize(values: Array<V|null>): string {
    const blockNums = this.convertToBlockNumbers(values);
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
   * Packs groups of valueNums into numbers < MAX_BLOCK_INTEGER. This is done by essentially
   * generating a base setSize number where each 'digit' is an entry in valueNums.
   * @param valueNums Numbers between [0, setSize).
   */
  private convertToBlockNumbers(values: V[]): number[] {
    const valuesLeft = values.slice();
    const valueSet = this.valueSet.slice();

    const blockNumbers: number[] = [];
    let currentBlock = 0;
    let scalar = 1;
    function appendCurrent() {
      assert(currentBlock < MAX_BLOCK_INTEGER);
      blockNumbers.push(currentBlock);
      currentBlock = 0;
      scalar = 1;
    }

    for (const value of values) {
      const index = valueSet.indexOf(value);
      assert(index > -1, `Cannot find ${value} in valueSet`);
      const valueNum = index + 1;

      if (currentBlock + valueNum * scalar > MAX_BLOCK_INTEGER) {
        appendCurrent();
      }

      currentBlock += valueNum * scalar;

      scalar *= valueSet.length + 1;

      valuesLeft.shift();
      if (valuesLeft.indexOf(value) === -1) {
        remove(valueSet, value);
      }
    }
    if (scalar > 1) {
      // Append the final block.
      appendCurrent();
    }
    return blockNumbers;
  }

  deserialize(serialized: string, entrySet: Array<V>): Array<V> {
    const entriesLeft = entrySet;
    const valueSet = this.valueSet.slice();

    const values: Array<V> = [];
    for (let i = 0; i < serialized.length; i += BLOCK_SIZE) {
      const block = serialized.substr(i, BLOCK_SIZE);
      let blockNumber = parseInt(block, 36);

      while (blockNumber > 0) {
        assert(entriesLeft.length, 'entriesLeft ran out before finishing deserializing');
        assert(valueSet.length, 'valueSet ran out before finishing deserializing');

        const base = valueSet.length + 1;
        const num = blockNumber % base;

        // Remove num from blockNumber.
        blockNumber = Math.floor(blockNumber / base);

        assert(num >= 1 && num <= valueSet.length, 'unexpected value number ' + num);
        const value = valueSet[num - 1];
        values.push(value);

        const entryIndex = entriesLeft.indexOf(value);
        assert(entryIndex > -1, 'Value not found in entrySet: ' + value);
        entriesLeft.splice(entryIndex, 1);
        if (entriesLeft.indexOf(value) === -1) {
          remove(valueSet, value);
        }
      }
    }
    return values;
  }
}

function remove<T>(arr: Array<T>, value: T) {
  const i = arr.indexOf(value);
  assert(i > -1, value + ' not found in array.');
  arr.splice(i, 1);
}
