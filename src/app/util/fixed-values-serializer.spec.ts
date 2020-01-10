import { FixedValuesSerializer, base62Encode, base62Decode } from './fixed-values-serializer';

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
    expect(serialized).toBe('G3SKvlkZ6LnkwYzfjvvl85057oVEKYS');
    expect(numSetSerialier.deserialize(serialized, valueSet)).toEqual(input);
  });

  it('serializes enums', () => {
    const input = [TestEnum.BAR, TestEnum.BAZ, TestEnum.BAZ, TestEnum.FOO];
    const valueSet = copyAndSort(input);

    const serialized = enumSerializer.serialize(input);
    expect(serialized).toBe('18');
    expect(enumSerializer.deserialize(serialized, valueSet)).toEqual(input);
  });

  function copyAndSort<T>(arr: Array<T>): Array<T> {
    return arr.slice().sort();
  }

  it('base62Encode', () => {
    expect(base62Encode(0)).toBe('');
    expect(base62Encode(1)).toBe('1');
    expect(base62Encode(10)).toBe('a');
    expect(base62Encode(36)).toBe('A');
    expect(base62Encode(62)).toBe('10');
    expect(base62Encode(81937242)).toBe('5xNCq');
  });

  it('base62Decode', () => {
    expect(base62Decode('')).toBe(0);
    expect(base62Decode('1')).toBe(1);
    expect(base62Decode('a')).toBe(10);
    expect(base62Decode('A')).toBe(36);
    expect(base62Decode('10')).toBe(62);
    expect(base62Decode('5xNCq')).toBe(81937242);
  });
});
