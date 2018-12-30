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

  it('serializes sparse array', () => {
    // Create an array that's mostly undefined.
    const input = [];
    for (let i = 0; i < 16; i++) {
      input.push(i === 4 ? 3 : undefined);
    }
    input.push(7);

    const serialized = numSetSerialier.serialize(input);
    expect(serialized).toBe('000000196sqw');
    expect(numSetSerialier.deserialize(serialized)).toEqual(input);
  });

  it('serializes a large input', () => {
    const input = [];
    for (let i = 0; i < 55; i++) {
      input.push(i % 10);
    }

    const serialized = numSetSerialier.serialize(input);
    expect(serialized).toBe('1gi98gfs5t2ycb6pg2gh0qos5rz53t5zv9e1f1b');
    expect(numSetSerialier.deserialize(serialized)).toEqual(input);
  });

  it('serializes enums', () => {
    const input = [TestEnum.BAR, TestEnum.BAZ, undefined, TestEnum.FOO];

    const serialized = enumSerializer.serialize(input);
    expect(serialized).toBe('26');
    expect(enumSerializer.deserialize(serialized)).toEqual(input);
  });
});
