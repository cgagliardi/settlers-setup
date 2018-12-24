/**
 * @fileoverview Functions for manipulating and searching arrays, sets, and maps.
 */

export function hasAll<T>(set: Set<T>|Map<T, any>, ...vals: T[]): boolean {
  for (const val of vals) {
    if (!set.has(val)) {
      return false;
    }
  }
  return true;
}

export function sumByKey<T>(map: Map<T, number>, ...keys: T[]): number {
  let sum = 0;
  for (const key of keys) {
    sum += map.get(key) || 0;
  }
  return sum;
}

export function findLowestBy<T>(collection: ReadonlyArray<T>, fn: (v: T) => number): T|undefined {
  let lowestVal;
  let lowestNum = Number.MAX_VALUE;
  for (const val of collection) {
    const score = fn(val);
    if (score < lowestNum) {
      lowestNum = score;
      lowestVal = val;
    }
  }
  return lowestVal;
}

export function findAllLowestBy<T>(collection: ReadonlyArray<T>, fn: (v: T) => number): T[]|undefined {
  let lowestVals;
  let lowestNum = Number.MAX_VALUE;
  for (const val of collection) {
    const score = fn(val);
    if (score < lowestNum) {
      lowestNum = score;
      lowestVals = [val];
    } else if (score === lowestNum) {
      lowestVals.push(val);
    }
  }
  return lowestVals;
}

export function findHighestBy<T>(collection: ReadonlyArray<T>, fn: (v: T) => number): T|undefined {
  let highestVal;
  let highestNum = Number.MIN_VALUE;
  for (const val of collection) {
    const score = fn(val);
    if (score > highestNum) {
      highestNum = score;
      highestVal = val;
    }
  }
  return highestVal;
}