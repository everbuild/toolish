import { filterDuplicateElements, findOrAddElementBy, removeElement, removeAllElements, removeAllElementsBy, removeElementBy, sortArray, sortArrayBy, swapElement, swapAllElements, swapAllElementsBy, swapElementBy, swapOrAddElementBy, toggleElement, toggleElementBy } from '../src/array';
import { equals } from '../src/general';

test('findOrAddElementBy', () => {
  const array = [1, 2];
  expect(findOrAddElementBy(array, 2, equals(2))).toBe(2);
  expect(array).toEqual([1, 2]);
  expect(findOrAddElementBy(array, 3, equals(3))).toBe(3);
  expect(array).toEqual([1, 2, 3]);
});

test('swapElement', () => {
  const array = [1, 2, 3, 4];

  expect(swapElement(array, 2, 1)).toBe(2);
  expect(array).toEqual([1, 1, 3, 4]);

  expect(swapElement(array, 2, 1)).toBeUndefined();
  expect(array).toEqual([1, 1, 3, 4]);
});

test('swapAllElements', () => {
  const array = [1, 2, 3, 2];

  expect(swapAllElements(array, 2, 1)).toEqual([2, 2]);
  expect(array).toEqual([1, 1, 3, 1]);

  expect(swapAllElements(array, 2, 4)).toEqual([]);
  expect(array).toEqual([1, 1, 3, 1]);
});


test('swapElementBy', () => {
  const array = [1, 2, 3, 4];

  expect(swapElementBy(array, 5, isEven)).toBe(2);
  expect(array).toEqual([1, 5, 3, 4]);

  expect(swapElementBy(array, 7, isEven)).toBe(4);
  expect(array).toEqual([1, 5, 3, 7]);

  expect(swapElementBy(array, 0, isEven)).toBe(undefined);
  expect(array).toEqual([1, 5, 3, 7]);
});

test('swapAllElementsBy', () => {
  const array = [1, 2, 3, 4];

  expect(swapAllElementsBy(array, 1, isEven)).toEqual([2, 4]);
  expect(array).toEqual([1, 1, 3, 1]);

  expect(swapAllElementsBy(array, 3, isEven)).toEqual([]);
  expect(array).toEqual([1, 1, 3, 1]);
});

test('swapOrAddElementBy', () => {
  const array = [{ key: 1, value: 1 }, { key: 2, value: 1 }];

  expect(swapOrAddElementBy(array, { key: 1, value: 2 }, v => v.key === 1)).toEqual({ key: 1, value: 1 });
  expect(array).toEqual([{ key: 1, value: 2 }, { key: 2, value: 1 }]);

  expect(swapOrAddElementBy(array, { key: 3, value: 1 }, v => v.key === 3)).toBe(undefined);
  expect(array).toEqual([{ key: 1, value: 2 }, { key: 2, value: 1 }, { key: 3, value: 1 }]);
});

test('removeElement', () => {
  const array = [1, 2, 3, 2];

  expect(removeElement(array, 2)).toBe(2);
  expect(array).toEqual([1, 3, 2]);

  expect(removeElement(array, 2)).toBe(2);
  expect(array).toEqual([1, 3]);

  expect(removeElement(array, 2)).toBeUndefined();
  expect(array).toEqual([1, 3]);
});

test('removeAllElements', () => {
  const array = [1, 2, 3, 2];

  expect(removeAllElements(array, 2)).toEqual([2, 2]);
  expect(array).toEqual([1, 3]);

  expect(removeAllElements(array, 2)).toEqual([]);
  expect(array).toEqual([1, 3]);
});

test('removeElementBy', () => {
  const array = [1, 2, 3, 4];

  expect(removeElementBy(array, isEven)).toBe(2);
  expect(array).toEqual([1, 3, 4]);

  expect(removeElementBy(array, isEven)).toBe(4);
  expect(array).toEqual([1, 3]);

  expect(removeElementBy(array, isEven)).toBeUndefined();
  expect(array).toEqual([1, 3]);
});

test('removeAllElementsBy', () => {
  const array = [1, 2, 3, 4];

  expect(removeAllElementsBy(array, isEven)).toEqual([2, 4]);
  expect(array).toEqual([1, 3]);

  expect(removeAllElementsBy(array, isEven)).toEqual([]);
  expect(array).toEqual([1, 3]);
});

test('filterDuplicateElements', () => {
  const array = [1, 2, 2, 3, 7, 7, 7, 6, 9];
  const original = array.slice();

  const filtered = filterDuplicateElements(array);
  expect(filtered).toEqual([1, 2, 3, 7, 6, 9]);
  expect(array).toEqual(original);

  expect(filterDuplicateElements(filtered)).toEqual(filtered);
});

test('toggleElement', () => {
  const array = [1, 2, 2, 3];

  expect(toggleElement(array, 2)).toBe(2);
  expect(array).toEqual([1, 2, 3]);
  expect(toggleElement(array, 2)).toBe(2);
  expect(array).toEqual([1, 3]);
  expect(toggleElement(array, 2)).toBeUndefined();
  expect(array).toEqual([1, 3, 2]);
  expect(toggleElement(array, 0)).toBeUndefined();
  expect(array).toEqual([1, 3, 2, 0]);
});

test('toggleElementBy', () => {
  const a = { key: 1, value: 3 };
  const b = { key: 2, value: 2 };
  const c = { key: 3, value: 1 };
  const array = [a, b];

  expect(toggleElementBy(array, a, (v1, v2) => v1.key === v2.key)).toEqual(a);
  expect(array).toEqual([b]);

  expect(toggleElementBy(array, a, (v1, v2) => v1.key === v2.key)).toBeUndefined();
  expect(array).toContain(a);

  expect(toggleElementBy(array, c, (v1, v2) => v1.key === v2.key)).toBeUndefined();
  expect(array).toContain(c);
});

test('sortArray', () => {
  const a = { a: 2, b: 100 };
  const b = { a: 4, b: 50 };
  const c = { a: 2, b: 250 };
  const mess = [true, false, Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, null, undefined, 1337n, '777', 'atlas', 'ATLAS', 100, 0, 'artist', '747', b, a];
  const neat = [null, undefined, false, true, Number.NaN, Number.NEGATIVE_INFINITY, 0, 100, '747', '777', 1337n, Number.POSITIVE_INFINITY, 'artist', 'atlas', 'ATLAS', a, b];

  sortArray(mess);
  expect(mess).toEqual(neat);

  expect(sortArrayBy([c, a, b], 'b')).toEqual([b, a, c]);
  expect(sortArrayBy([c, b, a], ['a', 'b'])).toEqual([a, c, b]);
  expect(sortArrayBy([c, b, a], ['a', 'b'], -1)).toEqual([b, c, a]);
  expect(sortArrayBy([c, b, a], ['a', 'b'], [1, -1])).toEqual([c, a, b]);
  expect(sortArrayBy([c, a, b], v => v.b)).toEqual([b, a, c]);
});

function isEven(v: number) {
  return v % 2 === 0;
}
