import { Transformation } from './types';

/**
 * @file Utilities for working with maps
 */

/**
 * If the given map contains an entry for the given key, returns its value,
 * otherwise adds a new entry with the given value and returns that.
 * This is often a simpler alternative to a multimap, e.g.:
 * `getOrAddEntry(mapOfArrays, key, []).push(value)`
 */
export function getOrAddEntry<K, V>(map: Map<K, V>, key: K, value: V): V {
  return getOrCreateEntry(map, key, () => value);
}

/**
 * If the given map contains an entry for the given key, returns its value,
 * otherwise adds a new entry with the result of calling the given function, and returns that.
 */
export function getOrCreateEntry<K, V>(map: Map<K, V>, key: K, factory: Transformation<K, V>): V {
  let current = map.get(key);
  if (current === undefined) {
    current = factory(key);
    map.set(key, current);
  }
  return current;
}

export function objectToMap<K extends string, V>(object: Record<K, V>): Map<K, V> {
  return new Map(Object.entries(object) as Array<[K, V]>);
}

export function mapToObject<K extends keyof any, V>(map: Map<K, V>): Record<K, V> {
  return Object.fromEntries(map.entries()) as Record<K, V>;
}