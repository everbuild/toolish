import { getOrAddEntry, objectToMap } from '../src/map';

test('getOrAddEntry', () => {
  const map = new Map<string, Array<number>>();
  getOrAddEntry(map, 'a', []).push(1);
  expect(map).toEqual(objectToMap({ a: [1] }));
  getOrAddEntry(map, 'a', []).push(2);
  expect(map).toEqual(objectToMap({ a: [1, 2] }));

  const weakMap = new WeakMap<symbol, Array<number>>();
  const s = Symbol()
  expect(weakMap.get(s)).toBeUndefined(  );
  getOrAddEntry(weakMap, s, []).push(1);
  expect(weakMap.get(s)).toEqual( [1] );
  getOrAddEntry(weakMap, s, []).push(2);
  expect(weakMap.get(s)).toEqual( [1,2] );
});

