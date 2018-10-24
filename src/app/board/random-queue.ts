
function getRandom(max: number): number {
  return Math.floor(max * Math.random());
}

/**
 * RandomQueue has a lot of array-like functions, but will always return
 * values at random.
 */
export class RandomQueue<T> {
  // Visible for testing.
  static getRandomInt = getRandom;

  vals: T[];
  nextForPop: number = null;

  /**
   * @param vals Initial values.
   * @param getRandomInt Used for testing.
   */
  constructor(
    initial?: T[]|RandomQueue<T>) {
    if (initial instanceof RandomQueue) {
      this.vals = initial.vals.slice();
    } else {
      this.vals = initial.slice();
    }
  }

  /**
   * Example:
   * RandomQueue.createByCounts(['a', 3], ['b', 1]);
   * creates ['a', 'a', 'a', 'b'];
   * @param valueCounts A nested array of values followed by the amount of that value
   *     that should be in the queue.
   */
  static createByCounts<T>(...valueCounts: Array<[T, number]>) {
    const vals = [];
    for (const [val, n] of valueCounts) {
      for (let i = 0; i < n; i++) {
        vals.push(val);
      }
    }
    return new RandomQueue(vals);
  }

  get length() {
    return this.vals.length;
  }

  isEmpty() {
    return this.vals.length === 0;
  }

  push(...vals: T[]) {
    this.vals.push(...vals);
    this.markMutated();
  }

  /**
   * Removes a single instances of val from the queue.
   * @returns True if such a value was found.
   */
  remove(val: T) {
    const i = this.vals.indexOf(val);
    if (i === -1) {
      return false;
    }
    this.removeAtIndex(i);
    return true;
  }

  filter(fn: (v: T) => boolean): RandomQueue<T> {
    return new RandomQueue(this.vals.filter(fn));
  }

  filterBy(...vals: T[]): RandomQueue<T> {
    return this.filter(val => vals.indexOf(val) > -1);
  }

  /**
   * @returns A random value excluding any values in vals. Returns undefined
   *     if it was unable to match anything.
   */
  popExcluding(...vals: T[]): T|undefined {
    const filtered = this.filter(val => vals.indexOf(val) === -1);
    const popped = filtered.pop();
    if (popped === undefined) {
      return undefined;
    }
    this.remove(popped);
    return popped;
  }

  pop(): T|undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    if (this.nextForPop === null) {
      this.nextForPop = RandomQueue.getRandomInt(this.vals.length);
    }
    return this.removeAtIndex(this.nextForPop);
  }

  // Returns the next value that pop will return.
  // This becomes incorrect any time the queue is mutated.
  peek(): T|undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    this.setNextForPop();
    return this.vals[this.nextForPop];
  }

  private removeAtIndex(i: number): T|undefined {
    const val = this.vals[i];
    this.vals.splice(i, 1);
    this.markMutated();
    return val;
  }

  private setNextForPop() {
    this.nextForPop = RandomQueue.getRandomInt(this.vals.length);
  }

  private markMutated() {
    this.nextForPop = null;
  }
}