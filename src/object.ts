import { Transformation } from './types';

export function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

/**
 * Better typed version of {@link !Object.keys}
 */
export function getPropertyNames<T extends object>(object: T): Array<keyof T> {
  return Object.keys(object) as Array<keyof T>;
}

/**
 * Calls the given function for each property of the given object, with the value (first argument!) and key (second argument).
 */
export function forEachProperty<T extends object>(object: T, visit: <K extends keyof T> (value: T[K], key: K) => any): void {
  getPropertyNames(object).forEach(k => visit(object[k], k));
}

/**
 * Returns a new object with the results of passing the value (first argument!) and key (second argument) of each property to the given function.
 * In other words, the returned object associates the existing keys with new values as returned by the given function.
 */
export function mapProperties<T extends object, R extends { [P in keyof T]: any }>(object: T, transform: <K extends keyof T> (value: T[K], key: K) => R[K]): R {
  const result = {} as R;
  forEachProperty(object, (v, k) => result[k] = transform(v, k));
  return result;
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
