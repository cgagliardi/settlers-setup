import { RandomQueue } from './random-queue';

describe('RandomQueue', () => {
  const originalGetRandomInt = RandomQueue.getRandomInt;
  let nextRandom = 0;

  beforeAll(() => {
    RandomQueue.getRandomInt = () => nextRandom;
  });

  afterAll(() => {
    RandomQueue.getRandomInt = originalGetRandomInt;
  });

  it('pops at random', () => {
    const queue = new RandomQueue([0, 1, 2]);
    expect(queue.length).toBe(3);
    nextRandom = 1;
    expect(queue.pop()).toBe(1);
    expect(queue.length).toBe(2);
    // Now pop the 2 which is at index 1.
    expect(queue.pop()).toBe(2);
    expect(queue.length).toBe(1);
    nextRandom = 0;
    expect(queue.pop()).toBe(0);
    expect(queue.length).toBe(0);
  });

  it('pop on empty returns undefined', () => {
    const queue = new RandomQueue([]);
    expect(queue.isEmpty()).toBe(true);
    expect(queue.pop()).toBeUndefined();
  });

  it('peek returns popped value', () => {
    const queue = new RandomQueue(['a', 'b', 'c']);
    nextRandom = 1;
    expect(queue.peek()).toBe('b');
    // Shuffle our random number and confirm that it's new value
    // is ignored by pop.
    nextRandom = 0;
    expect(queue.pop()).toBe('b');
  });

  it('pushes new values', () => {
    const queue = new RandomQueue([]);
    queue.push(1, 2);
    verifyValues(queue, 1, 2);
    queue.push(5);
    verifyValues(queue, 1, 2, 5);
  });

  it('clones existing random queue', () => {
    const queue = new RandomQueue([0, 1]);
    const queue2 = new RandomQueue(queue);
    verifyValues(queue, 0, 1);
    // Manipulate queue to confirm it doesn't affect queue2.
    queue.pop();
    verifyValues(queue2, 0, 1);
  });

  it('removes a single match', () => {
    const queue = new RandomQueue(['a', 'b', 'c', 'b']);
    expect(queue.remove('b')).toBe(true);
    verifyValues(queue, 'a', 'c', 'b');
    expect(queue.remove('b')).toBe(true);
    verifyValues(queue, 'a', 'c');
    expect(queue.remove('b')).toBe(false);
    verifyValues(queue, 'a', 'c');
  });

  it('filter creates a new queue', () => {
    const queue = new RandomQueue([0, 1, 2, 3]);
    const queue2 = queue.filter(n => n > 1);
    verifyValues(queue2, 2, 3);
    verifyValues(queue, 0, 1, 2, 3);
  });

  it('filterBy filters all matches', () => {
    const queue = new RandomQueue([0, 0, 1, 2, 3, 3]);
    const queue2 = queue.filterBy(0, 2);
    verifyValues(queue2, 0, 0, 2);
    verifyValues(queue, 0, 0, 1, 2, 3, 3);
  });

  /**
   * Verify the contents of queue in order without removing anything from it.
   * This is done by the fact that we know that our nextRandom funtion will
   * pull from the array at that index.
   */
  function verifyValues<T>(queue: RandomQueue<T>, ...vals: T[]) {
    nextRandom = 0;
    expect(queue.length).toBe(vals.length);
    for (let i = 0; i < vals.length; i++) {
      nextRandom = i;
      expect(queue.peek()).toBe(vals[i]);
    }
  }
});
