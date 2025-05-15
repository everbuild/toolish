import { Transformation } from './types';

/**
 * @file Utilities for working with objects
 */

export function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

/**
 * Calls the given function for each property of the given object, with the value (first argument!) and key (second argument).
 */
export function forEachProperty<K extends keyof any, V>(object: Record<K, V>, visit: (v: V, k: K) => void): void {
  Object.entries(object).forEach(([k, v]) => visit(v as V, k as K));
}

/**
 * Returns a new object with the results of passing the value (first argument!) and key (second argument) of each property to the given function.
 * In other words, the returned object associates the existing keys with new values as returned by the given function.
 */
export function mapProperties<K extends keyof any, V1, V2 = V1>(source: Record<K, V1>, transform: (v: V1, k: K) => V2): Record<K, V2> {
  const sourceEntries = Object.entries(source);
  const targetEntries = sourceEntries.map(([k, v]) => [k, transform(v as V1, k as K)]);
  return Object.fromEntries(targetEntries);
}

/**
 * If the given object contains a property with the given name, returns its value,
 * otherwise adds a new property with the given value and returns that.
 */
export function getOrAddProperty<T extends object, K extends keyof T>(object: T, name: K, value: T[K]): T[K] {
  return getOrCreateProperty(object, name, () => value);
}

/**
 * If the given object contains a property with the given name, returns its value,
 * otherwise adds a new property with the result of calling the given factory function, and returns that.
 */
export function getOrCreateProperty<T extends object, K extends keyof T>(object: T, name: K, factory: Transformation<K, T[K]>): T[K] {
  if (name in object) {
    return object[name];
  } else {
    return object[name] = factory(name);
  }
}
