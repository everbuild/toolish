import { equals, isNumeric, passThrough } from './general';
import { isObject } from './object';
import { DualPredicate, isPresent, Predicate, Producer, Transformation } from './types';

/**
 * @file Utilities for working with arrays
 */

export type ArrayElement<T> = T extends Array<infer E> ? E : never;

export type MaybeArray<T> = T | Array<T>;

export type Comparator<T> = Exclude<Parameters<Array<T>['sort']>[0], undefined>;

export type SortKeyProducer<T> = Transformation<T, any>

export type SortKey<T> = keyof T | SortKeyProducer<T>

const UNDEFINED_PLACEHOLDER = Symbol() as any;

/**
 * If the given array contains an element matching the given predicate, returns its value,
 * otherwise adds the given default value to the end, and returns that.
 * For your convenience the given value is also passed to the predicate as a second parameter,
 * so you can easily compare the two if needed.
 */
export function findByOrAdd<T>(array: Array<T>, value: T, predicate: DualPredicate<T>): T {
  return findByOrCreate(array, () => value, v => predicate(v, value));
}

/**
 * If the given array contains an element matching the given predicate, returns its value,
 * otherwise adds the result of calling the given factory function to the end, and returns that.
 */
export function findByOrCreate<T>(array: Array<T>, factory: Producer<T>, predicate: Predicate<T>): T {
  let result = array.find(predicate);
  if (result === undefined) array.push(result = factory());
  return result;
}

/**
 * Replaces the first array element matching the given value with the given replacement.
 * @returns the original element if replaced, undefined otherwise
 */
export function swap<T>(array: Array<T>, value: T, replacement: T): T | undefined {
  const i = array.indexOf(value);
  if (i >= 0) {
    const result = array[i];
    array[i] = replacement;
    return result;
  }
}

/**
 * Replaces all array elements matching the given value with the given replacement.
 * @returns the original replaced elements
 */
export function swapAll<T>(array: Array<T>, value: T, replacement: T): Array<T> {
  return swapAllBy(array, replacement, equals(value));
}

/**
 * Replaces the first array element matching the predicate with the given replacement.
 * For your convenience the given replacement value is also passed to the predicate as a second parameter,
 * so you can easily compare the two if needed.
 * @returns the original element if replaced, undefined otherwise
 */
export function swapBy<T>(array: Array<T>, replacement: T, predicate: DualPredicate<T>): T | undefined {
  const i = array.findIndex(v => predicate(v, replacement));
  if (i >= 0) {
    const result = array[i];
    array[i] = replacement;
    return result;
  }
}

/**
 * Replaces all array elements matching the predicate with the given replacement.
 * For your convenience the given replacement value is also passed to the predicate as a second parameter,
 * so you can easily compare the two if needed.
 * @returns the original replaced elements
 */
export function swapAllBy<T>(array: Array<T>, replacement: T, predicate: DualPredicate<T>): Array<T> {
  return array.filter((v, i) => {
    const match = predicate(v, replacement);
    if (match) array[i] = replacement;
    return match;
  });
}

/**
 * Replaces the first array element matching the predicate with the given replacement, or else adds it to the end of the array.
 * For your convenience the given replacement value is also passed to the predicate as a second parameter,
 * so you can easily compare the two if needed.
 * @returns the original element if replaced, undefined if added
 */
export function swapByOrAdd<T>(array: Array<T>, replacement: T, predicate: DualPredicate<T>): T | undefined {
  const result = swapBy(array, replacement, predicate);
  if (result === undefined) array.push(replacement);
  return result;
}

/**
 * Removes the first matching element from the given array.
 * If the array doesn't contain the element it's left as is.
 * @returns the original element if removed, undefined otherwise
 */
export function remove<T>(array: Array<T>, element: T): T | undefined {
  const i = array.indexOf(element);
  if (i >= 0) return array.splice(i, 1)[0];
}

/**
 * Removes all matching element from the given array.
 * @returns the removed elements
 */
export function removeAll<T>(array: Array<T>, element: T): Array<T> {
  return removeAllBy(array, equals(element));
}

/**
 * Removes the first array element matching the predicate.
 * @returns the original element if removed, undefined otherwise
 */
export function removeBy<T>(array: Array<T>, predicate: Predicate<T>): T | undefined {
  const index = array.findIndex(predicate);
  if (index >= 0) return array.splice(index, 1)[0];
}

/**
 * Removes all array elements matching the predicate.
 * @returns the removed elements
 */
export function removeAllBy<T>(array: Array<T>, predicate: Predicate<T>): Array<T> {
  return array.filter((v, i) => {
    const match = predicate(v);
    if (match) array.splice(i, 1);
    return match;
  });
}

/**
 * Returns a new array with all duplicate elements removed
 */
export function filterDuplicates<T>(array: Array<T>): Array<T> {
  return [...new Set(array)];
}

/**
 * Removes the first matching element from the given array or adds it if the array doesn't contain the element yet.
 * @returns the original element if removed, undefined if added
 * @see filterDuplicates to make sure an array contains unique values
 */
export function toggle<T>(array: Array<T>, element: T): T | undefined {
  const result = remove(array, element);
  if (result === undefined) array.push(element);
  return result;
}

/**
 * If the given array contains an element matching the predicate it is removed, otherwise it is added to the end.
 * For your convenience the given element value is also passed to the predicate as a second parameter,
 * so you can easily compare the two if needed.
 * @returns the original element if removed, undefined if added
 */
export function toggleBy<T>(array: Array<T>, element: T, predicate: DualPredicate<T>): T | undefined {
  const result = removeBy(array, v => predicate(v, element));
  if (result === undefined) array.push(element);
  return result;
}

/**
 * Like {@link sortBy}, but sorts directly by the element values.
 */
export function sort<T>(array: Array<T>, order?: number): Array<T> {
  return sortBy(array, passThrough, order);
}

/**
 * Sorts an array in place by a specific key.
 * If you need to preserve the original array, make a copy first with e.g. {@link Array#slice}.
 * Values of differing types are sorted in groups according to below order:
 * nullish, booleans, numbers (including numeric strings), strings (case-insensitive), symbols, objects (by their JSON representation), everything else.
 * NOTE this is unlike default {@link Array#sort} behaviour, which sorts by string representation and moves all undefined elements to the end.
 * @param array
 * @param key name of an element property
 * @param order any positive number for ascending (default); negative for descending (0 retains original order, i.e. the sort has no effect)
 * @returns the given array
 */
export function sortBy<T>(array: Array<T>, key: keyof T, order ?: number): Array<T>;

/**
 * Like {@link sortBy} with a single key, but with multiple keys.
 * If two elements compare equally with the first key, the second one is tried, and so on.
 * The same order is applied for all keys.
 */
export function sortBy<T>(array: Array<T>, keys: Array<keyof T>, order?: number): Array<T>;

/**
 * Like {@link sortBy} with multiple keys, but allows passing a specific order for each key.
 * Ascending order is assumed for any keys without corresponding order.
 */
export function sortBy<T>(array: Array<T>, keys: Array<keyof T>, orders: Array<number>): Array<T>;

/**
 * Like {@link sortBy} with a single key, but allows passing a function that returns the sort value of a given element.
 */
export function sortBy<T>(array: Array<T>, key: SortKeyProducer<T>, order?: number): Array<T>;

/**
 * Like {@link sortBy} with multiple keys, but allows passing functions that return the sort values of a given element.
 */
export function sortBy<T>(array: Array<T>, keys: Array<SortKeyProducer<T>>, order?: number): Array<T>;

/**
 * Like {@link sortBy} with multiple keys and orders, but allows passing functions that return the sort values of a given element.
 */
export function sortBy<T>(array: Array<T>, keys: Array<SortKeyProducer<T>>, orders: Array<number>): Array<T>;

export function sortBy<T>(array: Array<T>, keys: MaybeArray<SortKey<T>>, orders?: MaybeArray<number>): Array<T> {
  if (array.length < 2) return array;
  const allKeys = Array.isArray(keys) ? keys : [keys];

  const comparators = allKeys.map((k, i) => {
    const order = (Array.isArray(orders) ? orders[i] : orders) ?? 1;
    if (order === 0) return undefined;
    const key = normalizeSortKey(k);
    return makeComparator(key, order);
  }).filter(isPresent);

  if (comparators.length === 0) return array;
  const comparator = mergeComparators(comparators);

  swapAll(array, undefined, UNDEFINED_PLACEHOLDER);
  array.sort(comparator);
  swapAll(array, UNDEFINED_PLACEHOLDER, undefined);
  return array;
}

function normalizeSortKey<T>(key: SortKey<T>): SortKeyProducer<T> {
  if (typeof key === 'function') {
    return v => isPresent(v) ? key(v) : undefined;
  } else {
    return v => isPresent(v) ? v[key] : undefined;
  }
}

function makeComparator<T>(key: SortKeyProducer<T>, order: number): Comparator<T> {
  return (e1, e2) => {
    const v1 = key(e1);
    const v2 = key(e2);
    const g1 = getComparisonGroup(v1);
    const g2 = getComparisonGroup(v2);
    if (g1 > g2) return order;
    if (g1 < g2) return -order;
    const c1 = getComparisonValue(v1);
    const c2 = getComparisonValue(v2);
    if (c1 > c2) return order;
    if (c1 < c2) return -order;
    return 0;
  };
}

function getComparisonGroup(value: any): number {
  if (value === null || value === undefined || value === UNDEFINED_PLACEHOLDER) return 0;
  switch (typeof value) {
    case 'boolean':
      return 50;
    case 'number':
    case 'bigint':
      return 100;
    case 'string':
      return isNumeric(value) ? 100 : 200;
    case 'symbol':
      return 300;
    case 'object':
      return 400;
  }
  return 900;
}

function getComparisonValue(value: any): any {
  if (isObject(value)) return JSON.stringify(value);
  if (typeof value === 'string') return value.toLocaleLowerCase();
  if (typeof value === 'symbol') return value.toString();
  return value;
}

function mergeComparators<T>(comparators: Array<Comparator<T>>): Comparator<T> {
  return comparators.reduce((c1, c2) => {
    return (a, b) => {
      const r = c1(a, b);
      return r === 0 ? c2(a, b) : r;
    };
  });
}
