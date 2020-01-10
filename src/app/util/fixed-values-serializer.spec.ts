import { FixedValuesSerializer } from './fixed-values-serializer';

enum TestEnum {
  FOO = 'Foo',
  BAR = 'Bar',
  BAZ = 'Baz',
}

describe('FixedValuesSerializer', () => {
  const NUM_SET = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  let numSetSerialier: FixedValuesSerializer<number>;
  let enumSerializer: FixedValuesSerializer<TestEnum>;

  beforeAll(() => {
    numSetSerialier = new FixedValuesSerializer(NUM_SET);
    enumSerializer = new FixedValuesSerializer([TestEnum.FOO, TestEnum.BAR, TestEnum.BAZ]);
  });

  it('serializes a large input', () => {
    const input = [];
    for (let i = 0; i < 55; i++) {
      input.push(i % 10);
    }
    const valueSet = copyAndSort(input);

    const serialized = numSetSerialier.serialize(input);
    expect(serialized).toBe('k5k2k6rjem3bswnh3dufg1ktl0tls5582h6t');
    expect(numSetSerialier.deserialize(serialized, valueSet)).toEqual(input);
  });

  it('serializes enums', () => {
    const input = [TestEnum.BAR, TestEnum.BAZ, TestEnum.BAZ, TestEnum.FOO];
    const valueSet = copyAndSort(input);

    const serialized = enumSerializer.serialize(input);
    expect(serialized).toBe('1y');
    expect(enumSerializer.deserialize(serialized, valueSet)).toEqual(input);
  });

  function copyAndSort<T>(arr: Array<T>): Array<T> {
    return arr.slice().sort();
  }
});
