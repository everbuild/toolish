import { getOrAddEntry, objectToMap } from '../src/map';

test('getOrAddEntry', () => {
  const map = new Map<string, Array<number>>();
  getOrAddEntry(map, 'a', []).push(1);
  expect(map).toEqual(objectToMap({ a: [1] }));
  getOrAddEntry(map, 'a', []).push(2);
  expect(map).toEqual(objectToMap({ a: [1, 2] }));
});

