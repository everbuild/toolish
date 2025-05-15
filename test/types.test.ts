import { passThrough } from '../src/general';
import { expectEnumValue, expectOneOf, expectPresent, expectTruthy, getEnumKeys, getEnumValues, ifEnumValue, ifOneOf, ifPresent, ifTruthy, isEnumValue, isFalsy, isNullish, isOneOf, isPresent, isTruthy } from '../src/types';

test('nullish', () => {
  [null, undefined].forEach(v => expect(isNullish(v)).toBe(true));
  [false, 0, 0n, '', true, 1337, '.', {}].forEach(v => expect(isNullish(v)).toBe(false));

  expect([1, null, false, 2].filter(isPresent)).toEqual([1, false, 2]);

  expect(ifPresent(0, passThrough)).toBeDefined();
  expect(ifPresent(null, passThrough)).toBeUndefined();

  expect(expectPresent(0)).toBeDefined();
  expect(() => expectPresent(null)).toThrow();
});

test('truthy', () => {
  [null, undefined, false, 0, 0n, ''].forEach(v => expect(isFalsy(v)).toBe(true));
  [true, 1337, '.', {}].forEach(v => expect(isFalsy(v)).toBe(false));

  expect([1, null, false, 2].filter(isTruthy)).toEqual([1, 2]);

  expect(ifTruthy(true, passThrough)).toBeDefined();
  expect(ifTruthy(false, passThrough)).toBeUndefined();

  expect(expectTruthy(true)).toBeDefined();
  expect(() => expectTruthy(false)).toThrow();
});

test('enum', () => {
  enum E {A, B, C}

  expect(getEnumKeys(E)).toEqual(['A', 'B', 'C']);
  expect(getEnumValues(E)).toEqual([E.A, E.B, E.C]);

  [E.B, E.C as unknown, 2].forEach(v => expect(isEnumValue(v, E)).toBe(true));
  [3, '1', null].forEach(v => expect(isEnumValue(v, E)).toBe(false));

  expect(ifEnumValue(E.B, E, passThrough)).toBeDefined();
  expect(ifEnumValue(3, E, passThrough)).toBeUndefined();

  expect(expectEnumValue(E.B, E)).toBeDefined();
  expect(() => expectEnumValue(3, E)).toThrow();
});

test('oneOf', () => {
  const color = 'green';
  expect(isOneOf(color, 'red', 'green', 'blue')).toBe(true);
  expect(isOneOf(color, 'pink', 'orange', 'violet')).toBe(false);

  const options = [1, 2, 3];
  [1, 2, 3, 3].forEach(v => expect(isOneOf(v, ...options)).toBe(true));
  [0, 0.99999, null, '.', {}].forEach(v => expect(isOneOf(v, ...options)).toBe(false));

  expect(ifOneOf(1, options, passThrough)).toBeDefined();
  expect(ifOneOf(0, options, passThrough)).toBeUndefined();

  expect(expectOneOf(1, options)).toBeDefined();
  expect(() => expectOneOf(0, options)).toThrow();
});