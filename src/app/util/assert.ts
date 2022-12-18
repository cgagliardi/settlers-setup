export function assert<T>(val: T|null|undefined, msg = ''): asserts val is T {
  if (!val) {
    throw new Error(msg);
  }
}
