import { ArrayTtlCache, TtlCache } from '../src/cache';
import { delay } from '../src/timing';

test('basic', async () => {
  const load = (a: number, b: number) => a + b;
  const cache = new TtlCache(load);
  expect(await cache.get(1, 2)).toBe(3);
  expect(cache.getCached(1, 2)).toBe(3);
  expect(cache.getCached(2, 2)).toBe(undefined);
  cache.clear();
  expect(cache.getCached(1, 2)).toBe(undefined);
});

test('async load', async () => {
  const load = (a: number) => delay(10).then(() => a);
  const cache = new TtlCache(load);
  expect(await cache.get(1)).toBe(1);
});

test('object keys', async () => {
  const loadPhone = (address: { street: string, number: number }) => '01' + address.street + address.number;
  const cache = new TtlCache(loadPhone);
  expect(await cache.get({ street: '173', number: 505 })).toEqual('01173505');
  expect(cache.getCached({ street: '173', number: 505 })).toEqual('01173505');
  expect(cache.getCached({ street: '64', number: 505 })).toBe(undefined);
});

test('custom keys', async () => {
  const getKey = (params: Array<number>) => params.join(';');
  const load = (a: number, b: number) => a + b;
  const cache = new TtlCache(load, { getKey });
  expect(await cache.get(1, 2)).toBe(3);
  expect(cache.getCached(1, 2)).toBe(3);
  expect(cache.getCached(3, 4)).toBe(undefined);
});

test('singleton', async () => {
  const cache = new TtlCache(() => 1);
  expect(cache.getCached()).toBe(undefined);
  expect(await cache.get()).toBe(1);
  expect(cache.getCached()).toBe(1);
});

test('short ttl', async () => {
  let counter = 0;
  const cache = new TtlCache(() => ++counter, { ttl: 10 });
  expect(await cache.get()).toBe(1);
  expect(await cache.get()).toBe(1);
  await delay(50); // big enough to avoid scheduling inaccuracies
  expect(await cache.get()).toBe(2);
});

test('array', async () => {
  const values = Array(20).fill(0).map((x, i) => i);
  const cache = new ArrayTtlCache(offset => values.slice(offset, offset + 10));
  expect(cache.getCached(0)).toEqual([]);
  await cache.get(0);
  await cache.get(10);
  expect(cache.getAllCached()).toEqual(values);
});
