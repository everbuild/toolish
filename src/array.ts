import { equals, isNumeric, passThrough } from './general';
import { isObject } from './object';
import { DualPredicate, isPresent, Predicate, Producer, Transformation } from './types';

export type ArrayElement<T> = T extends Array<infer E> ? E : never;

export type StripArray<T> = T extends Array<infer E> ? E : T;

export type MaybeArray<T> = T | Array<T>;

export type Comparator<T> = Exclude<Parameters<Array<T>['sort']>[0], undefined>;

export type SortKeyProducer<T> = Transformation<T, any>

export type SortKey<T> = keyof T | SortKeyProducer<T>

const UNDEFINED_PLACEHOLDER = Symbol() as any;

/**
 * If the given index is negative, it is assumed to count back from the given limit (e.g. array length), and is translated as such.
 * E.g. `-1` becomes `limit - 1` and so on.
 * If the given index is positive, it is returned as is.
 *
 * NOTE that no attempt is made to cap the resulting index in any way, it may even be negative again if the given index is larger than the limit.
 * You can use {@link normalizeRangeStart} and {@link normalizeRangeEnd} for that.
 */
export function mirrorIndex(index: number, limit: number): number {
  if (index < 0) index += limit;
  return index;
}

/**
 * Normalizes an index denoting the start of a range within a longer array-like structure.
 * Effectively ensures that it is within [0, limit].
 * You can use a negative index to {@link mirrorIndex | count back from the end}.
 *
 * If start is omitted, 0 is assumed.
 *
 * @see {@link normalizeRangeEnd} and {@link normalizeRangeLength}.
 */
export function normalizeRangeStart(limit: number, start = 0): number {
  return Math.min(Math.max(0, mirrorIndex(start, limit)), limit);
}

/**
 * Normalizes an index denoting the end of a range within a longer array-like structure.
 * Effectively ensures that it is within [start, limit].
 * You can use negative indices to {@link mirrorIndex | count back from the end}.
 *
 * If end is omitted, limit is assumed.
 * If start is omitted, 0 is assumed.
 *
 * @see {@link normalizeRangeStart} and {@link normalizeRangeLength}.
 */
export function normalizeRangeEnd(limit: number, end = limit, start = 0): number {
  return Math.max(mirrorIndex(end, limit), mirrorIndex(start, limit));
}

/**
 * Normalizes the length of a range within a longer array-like structure, such that it does not exceed the end of that structure.
 * Effectively ensures that it is within [0, limit - start].
 * You can use a negative start index to {@link mirrorIndex | count back from the end}.
 *
 * If start is omitted, 0 is assumed.
 *
 * @see {@link normalizeRangeStart} and {@link normalizeRangeEnd}.
 */
export function normalizeRangeLength(limit: number, length: number, start = 0): number {
  start = normalizeRangeStart(limit, start);
  return normalizeRangeEnd(limit, start + length) - start;
}

/**
 * If the given array contains an element matching the given predicate, returns its value,
 * otherwise adds the given default value to the end, and returns that.
 * For your convenience the given value is also passed to the predicate as a second parameter,
 * so you can easily compare the two if needed.
 */
export function findOrAddElementBy<T>(array: Array<T>, value: T, predicate: DualPredicate<T>): T {
  return findOrCreateElementBy(array, () => value, v => predicate(v, value));
}

/**
 * If the given array contains an element matching the given predicate, returns its value,
 * otherwise adds the result of calling the given factory function to the end, and returns that.
 */
export function findOrCreateElementBy<T>(array: Array<T>, factory: Producer<T>, predicate: Predicate<T>): T {
  let result = array.find(predicate);
  if (result === undefined) array.push(result = factory());
  return result;
}

/**
 * Replaces the first array element matching the given value with the given replacement.
 * @returns the original element if replaced, undefined otherwise
 */
export function swapElement<T>(array: Array<T>, value: T, replacement: T): T | undefined {
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
export function swapAllElements<T>(array: Array<T>, value: T, replacement: T): Array<T> {
  return swapAllElementsBy(array, replacement, equals(value));
}

/**
 * Replaces the first array element matching the predicate with the given replacement.
 * For your convenience the given replacement value is also passed to the predicate as a second parameter,
 * so you can easily compare the two if needed.
 * @returns the original element if replaced, undefined otherwise
 */
export function swapElementBy<T>(array: Array<T>, replacement: T, predicate: DualPredicate<T>): T | undefined {
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
export function swapAllElementsBy<T>(array: Array<T>, replacement: T, predicate: DualPredicate<T>): Array<T> {
  return array.filter((v, i) => {
    const match = predicate(v, replacement);
    if (match) array[i] = replacement;
    return match;
  });
}

/**
 * Replaces the first array element matching the given value with the given replacement, or else adds it to the end of the array.
 * @returns the original element if replaced, undefined if added
 */
export function swapOrAddElement<T>(array: Array<T>, value :T, replacement: T): T | undefined {
  const result = swapElement(array, value, replacement);
  if (result === undefined) array.push(replacement);
  return result;
}

/**
 * Replaces the first array element matching the predicate with the given replacement, or else adds it to the end of the array.
 * For your convenience the given replacement value is also passed to the predicate as a second parameter,
 * so you can easily compare the two if needed.
 * @returns the original element if replaced, undefined if added
 */
export function swapOrAddElementBy<T>(array: Array<T>, replacement: T, predicate: DualPredicate<T>): T | undefined {
  const result = swapElementBy(array, replacement, predicate);
  if (result === undefined) array.push(replacement);
  return result;
}

/**
 * Removes the first matching element from the given array.
 * If the array doesn't contain the element it's left as is.
 * @returns the original element if removed, undefined otherwise
 */
export function removeElement<T>(array: Array<T>, element: T): T | undefined {
  const i = array.indexOf(element);
  if (i >= 0) return array.splice(i, 1)[0];
}

/**
 * Removes all matching element from the given array.
 * @returns the removed elements
 */
export function removeAllElements<T>(array: Array<T>, element: T): Array<T> {
  return removeAllElementsBy(array, equals(element));
}

/**
 * Removes the first array element matching the predicate.
 * @returns the original element if removed, undefined otherwise
 */
export function removeElementBy<T>(array: Array<T>, predicate: Predicate<T>): T | undefined {
  const index = array.findIndex(predicate);
  if (index >= 0) return array.splice(index, 1)[0];
}

/**
 * Removes all array elements matching the predicate.
 * @returns the removed elements
 */
export function removeAllElementsBy<T>(array: Array<T>, predicate: Predicate<T>): Array<T> {
  return array.filter((v, i) => {
    const match = predicate(v);
    if (match) array.splice(i, 1);
    return match;
  });
}

/**
 * Returns a new array with all duplicate elements removed
 */
export function filterDuplicateElements<T>(array: Array<T>): Array<T> {
  return [...new Set(array)];
}

/**
 * Removes the first matching element from the given array or adds it if the array doesn't contain the element yet.
 * @returns the original element if removed, undefined if added
 * @see {@link filterDuplicateElements} to make sure an array contains unique values
 */
export function toggleElement<T>(array: Array<T>, element: T): T | undefined {
  const result = removeElement(array, element);
  if (result === undefined) array.push(element);
  return result;
}

/**
 * If the given array contains an element matching the predicate it is removed, otherwise it is added to the end.
 * For your convenience the given element value is also passed to the predicate as a second parameter,
 * so you can easily compare the two if needed.
 * @returns the original element if removed, undefined if added
 */
export function toggleElementBy<T>(array: Array<T>, element: T, predicate: DualPredicate<T>): T | undefined {
  const result = removeElementBy(array, v => predicate(v, element));
  if (result === undefined) array.push(element);
  return result;
}

/**
 * Like {@link sortArrayBy}, but sorts directly by the element values.
 */
export function sortArray<T>(array: Array<T>, order?: number): Array<T> {
  return sortArrayBy(array, passThrough, order);
}

/**
 * Sorts an array in place by one or more specific keys.
 * If two elements compare equally with a given key, the next one is tried, and so on.
 * The same order is applied for all keys.
 * {@label STRING_KEYS_SAME_ORDER}
 *
 * If you need to preserve the original array, make a copy first with e.g. {@link !Array.slice}.
 *
 * Values of differing types are sorted in groups in this order:
 * nullish, booleans, numbers (including numeric strings), strings, symbols, objects, functions.
 * Objects are sorted by {@link !Object.valueOf} if that returns a primitive, their JSON representation otherwise (note arrays fall into this category as well).
 * Functions are sorted by {@link !Function.toString}.
 * All strings are sorted case-insensitive (including string obtained from objects or functions)
 *
 * NOTE this is unlike {@link !Array.sort}, which sorts by string representation and moves all undefined elements to the end.
 *
 * @param array
 * @param key name of an element property
 * @param order any positive number for ascending (default); negative for descending (0 retains original order, i.e. the sort has no effect)
 * @returns the given array
 */
export function sortArrayBy<T>(array: Array<T>, key: MaybeArray<keyof T>, order?: number): Array<T>;

/**
 * Like {@link sortArrayBy:STRING_KEYS_SAME_ORDER}, but allows passing a specific order for each key.
 * Ascending order is assumed for any key without corresponding order.
 * {@label STRING_KEYS_SEPARATE_ORDERS}
 */
export function sortArrayBy<T>(array: Array<T>, keys: Array<keyof T>, orders: Array<number>): Array<T>;

/**
 * Like {@link sortArrayBy:STRING_KEYS_SAME_ORDER}, but allows passing one or more functions that return the sort values of a given element.
 * {@label FUNCTION_KEYS_SAME_ORDER}
 */
export function sortArrayBy<T>(array: Array<T>, key: MaybeArray<SortKeyProducer<T>>, order?: number): Array<T>;

/**
 * Like {@link sortArrayBy:FUNCTION_KEYS_SAME_ORDER}, but allows passing a specific order for each key.
 * Ascending order is assumed for any key without corresponding order.
 * {@label FUNCTION_KEYS_SEPARATE_ORDERS}
 */
export function sortArrayBy<T>(array: Array<T>, keys: Array<SortKeyProducer<T>>, orders: Array<number>): Array<T>;

export function sortArrayBy<T>(array: Array<T>, keys: MaybeArray<SortKey<T>>, orders?: MaybeArray<number>): Array<T> {
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

  swapAllElements(array, undefined, UNDEFINED_PLACEHOLDER);
  array.sort(comparator);
  swapAllElements(array, UNDEFINED_PLACEHOLDER, undefined);
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
  if (isObject(value)) {
    value = value.valueOf();
    if (isObject(value)) value = JSON.stringify(value);
  }
  if (typeof value === 'function') value = value.toString();
  if (typeof value === 'symbol') value = value.toString();
  if (typeof value === 'string') return value.toLocaleLowerCase();
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
