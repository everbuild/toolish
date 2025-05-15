import { areEqual, isNumeric } from '../src/general';

test('areEqual', () => {
  expect(areEqual(1, 1)).toBe(true);
  expect(areEqual(1, '1')).toBe(false);
  expect(areEqual(1, 2)).toBe(false);
  expect(areEqual(1, {})).toBe(false);
  expect(areEqual([], [])).toBe(true);
  expect(areEqual([1, 2], [1, 2])).toBe(true);
  expect(areEqual([1, 2], [2, 1])).toBe(false);
  expect(areEqual([], [1])).toBe(false);
  expect(areEqual({}, {})).toBe(true);
  expect(areEqual({ a: 1 }, {})).toBe(false);
  expect(areEqual({ a: 1 }, { b: 1 })).toBe(false);
  expect(areEqual({ a: 1 }, { a: 1 })).toBe(true);
  expect(areEqual({ a: [{ b: { c: 'deep' } }] }, { a: [{ b: { c: 'deep' } }] })).toBe(true);
  expect(areEqual({ a: [{ b: { c: 'deep' } }] }, { a: [{ b: { c: 'deeper' } }] })).toBe(false);
});

test('isNumeric', () => {
  expect(isNumeric(1337)).toBe(true);
  expect(isNumeric('1337')).toBe(true);
  expect(isNumeric('1337code')).toBe(false);
  expect(isNumeric('n00b')).toBe(false);
  expect(isNumeric('   0000000000   ')).toBe(true);
  expect(isNumeric({})).toBe(false);
});