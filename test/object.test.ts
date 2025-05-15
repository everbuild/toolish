import { forEachProperty, getOrAddProperty, mapProperties } from '../src/object';

test('forEachProperty', () => {
  const object = { a: 1, b: 2 };
  const log: Array<any> = [];
  forEachProperty(object, (v, k) => log.push(k, v));
  expect(log).toEqual(['a', 1, 'b', 2]);
});

test('mapProperties', () => {
  const o1 = { a: 1, b: 2 };
  const o2 = mapProperties(o1, (v, k) => k + v);
  expect(o2).toEqual({ a: 'a1', b: 'b2' });
});

test('getOrAddProperty', () => {
  const object = {} as Record<any, number>;
  expect(getOrAddProperty(object, 'a', 1)).toBe(1);
  expect(getOrAddProperty(object, 'a', 2)).toBe(1);
  expect(object).toEqual({ a: 1 });
});

