import { filterDuplicates, findByOrAdd, remove, removeAll, removeAllBy, removeBy, sort, sortBy, swap, swapAll, swapAllBy, swapBy, swapByOrAdd, toggle, toggleBy } from '../src/array';
import { equals } from '../src/general';

test('findByOrAdd', () => {
  const array = [1, 2];
  expect(findByOrAdd(array, 2, equals(2))).toBe(2);
  expect(array).toEqual([1, 2]);
  expect(findByOrAdd(array, 3, equals(3))).toBe(3);
  expect(array).toEqual([1, 2, 3]);
});

test('swap', () => {
  const array = [1, 2, 3, 4];

  expect(swap(array, 2, 1)).toBe(2);
  expect(array).toEqual([1, 1, 3, 4]);

  expect(swap(array, 2, 1)).toBeUndefined();
  expect(array).toEqual([1, 1, 3, 4]);
});

test('swapAll', () => {
  const array = [1, 2, 3, 2];

  expect(swapAll(array, 2, 1)).toEqual([2, 2]);
  expect(array).toEqual([1, 1, 3, 1]);

  expect(swapAll(array, 2, 4)).toEqual([]);
  expect(array).toEqual([1, 1, 3, 1]);
});


test('swapBy', () => {
  const array = [1, 2, 3, 4];

  expect(swapBy(array, 5, isEven)).toBe(2);
  expect(array).toEqual([1, 5, 3, 4]);

  expect(swapBy(array, 7, isEven)).toBe(4);
  expect(array).toEqual([1, 5, 3, 7]);

  expect(swapBy(array, 0, isEven)).toBe(undefined);
  expect(array).toEqual([1, 5, 3, 7]);
});

test('swapAllBy', () => {
  const array = [1, 2, 3, 4];

  expect(swapAllBy(array, 1, isEven)).toEqual([2, 4]);
  expect(array).toEqual([1, 1, 3, 1]);

  expect(swapAllBy(array, 3, isEven)).toEqual([]);
  expect(array).toEqual([1, 1, 3, 1]);
});

test('swapByOrAdd', () => {
  const array = [{ key: 1, value: 1 }, { key: 2, value: 1 }];

  expect(swapByOrAdd(array, { key: 1, value: 2 }, v => v.key === 1)).toEqual({ key: 1, value: 1 });
  expect(array).toEqual([{ key: 1, value: 2 }, { key: 2, value: 1 }]);

  expect(swapByOrAdd(array, { key: 3, value: 1 }, v => v.key === 3)).toBe(undefined);
  expect(array).toEqual([{ key: 1, value: 2 }, { key: 2, value: 1 }, { key: 3, value: 1 }]);
});

test('remove', () => {
  const array = [1, 2, 3, 2];

  expect(remove(array, 2)).toBe(2);
  expect(array).toEqual([1, 3, 2]);

  expect(remove(array, 2)).toBe(2);
  expect(array).toEqual([1, 3]);

  expect(remove(array, 2)).toBeUndefined();
  expect(array).toEqual([1, 3]);
});

test('removeAll', () => {
  const array = [1, 2, 3, 2];

  expect(removeAll(array, 2)).toEqual([2, 2]);
  expect(array).toEqual([1, 3]);

  expect(removeAll(array, 2)).toEqual([]);
  expect(array).toEqual([1, 3]);
});

test('removeBy', () => {
  const array = [1, 2, 3, 4];

  expect(removeBy(array, isEven)).toBe(2);
  expect(array).toEqual([1, 3, 4]);

  expect(removeBy(array, isEven)).toBe(4);
  expect(array).toEqual([1, 3]);

  expect(removeBy(array, isEven)).toBeUndefined();
  expect(array).toEqual([1, 3]);
});

test('removeAllBy', () => {
  const array = [1, 2, 3, 4];

  expect(removeAllBy(array, isEven)).toEqual([2, 4]);
  expect(array).toEqual([1, 3]);

  expect(removeAllBy(array, isEven)).toEqual([]);
  expect(array).toEqual([1, 3]);
});

test('filterDuplicates', () => {
  const array = [1, 2, 2, 3, 7, 7, 7, 6, 9];
  const original = array.slice();

  const filtered = filterDuplicates(array);
  expect(filtered).toEqual([1, 2, 3, 7, 6, 9]);
  expect(array).toEqual(original);

  expect(filterDuplicates(filtered)).toEqual(filtered);
});

test('toggle', () => {
  const array = [1, 2, 2, 3];

  expect(toggle(array, 2)).toBe(2);
  expect(array).toEqual([1, 2, 3]);
  expect(toggle(array, 2)).toBe(2);
  expect(array).toEqual([1, 3]);
  expect(toggle(array, 2)).toBeUndefined();
  expect(array).toEqual([1, 3, 2]);
  expect(toggle(array, 0)).toBeUndefined();
  expect(array).toEqual([1, 3, 2, 0]);
});

test('toggleBy', () => {
  const a = { key: 1, value: 3 };
  const b = { key: 2, value: 2 };
  const c = { key: 3, value: 1 };
  const array = [a, b];

  expect(toggleBy(array, a, (v1, v2) => v1.key === v2.key)).toEqual(a);
  expect(array).toEqual([b]);

  expect(toggleBy(array, a, (v1, v2) => v1.key === v2.key)).toBeUndefined();
  expect(array).toContain(a);

  expect(toggleBy(array, c, (v1, v2) => v1.key === v2.key)).toBeUndefined();
  expect(array).toContain(c);
});

test('sort', () => {
  const a = { a: 2, b: 100 };
  const b = { a: 4, b: 50 };
  const c = { a: 2, b: 250 };
  const mess = [true, false, Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, null, undefined, 1337n, '777', 'atlas', 'ATLAS', 100, 0, 'artist', '747', b, a];
  const neat = [null, undefined, false, true, Number.NaN, Number.NEGATIVE_INFINITY, 0, 100, '747', '777', 1337n, Number.POSITIVE_INFINITY, 'artist', 'atlas', 'ATLAS', a, b];

  sort(mess);
  expect(mess).toEqual(neat);

  expect(sortBy([c, a, b], 'b')).toEqual([b, a, c]);
  expect(sortBy([c, b, a], ['a', 'b'])).toEqual([a, c, b]);
  expect(sortBy([c, b, a], ['a', 'b'], -1)).toEqual([b, c, a]);
  expect(sortBy([c, b, a], ['a', 'b'], [1, -1])).toEqual([c, a, b]);
  expect(sortBy([c, a, b], v => v.b)).toEqual([b, a, c]);
});

function isEven(v: number) {
  return v % 2 === 0;
}
