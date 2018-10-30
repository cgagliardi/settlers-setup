export function assert<T>(val: T|null|undefined, msg = ''): T {
  if (!val) {
    throw new Error(msg);
  }
  return val;
}
