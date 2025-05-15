import { isObject } from './object';
import { isBlank } from './string';
import { Predicate } from './types';

/**
 * Semantic interface for a function that cancels an action.
 * E.g.: a function like `subscribe(handler)` could return a `Cancel` function that unsubscribes given handler again.
 */
export interface Cancel {
  (): void;
}

/**
 * Denotes a class that uses one or more limited resources (e.g. memory, network connections,...).
 * It's generally advisable to call {@link free} as soon as it's no longer needed.
 * It's assumed that it's disposable, i.e. should no longer be used once freed.
 * Correct implementation is the responsibility of the user, no attempt is usually made to enforce this.
 * @see {@link ReusableResource} for an interface that is intended for reuse.
 */
export interface Resource {
  free(): void;
}

/**
 * Marks a resource that can be safely used after it has been freed, and as such can be freed multiple times during its lifetime.
 * This generally implies that a call to {@link Resource.free} releases any currently used resources, while continued use may allocate new ones.
 */
export interface ReusableResource extends Resource {
}

/**
 * Marks a class that can be cloned.
 */
export interface Cloneable<T> {
  clone(): T;
}

/**
 * Indicates that some operation was cancelled.
 */
export class CancelError extends Error {
  constructor(message = 'cancelled') {
    super(message);
  }
}

export function isResource(value: unknown): value is Resource {
  return isObject(value) && 'free' in value && typeof value.free === 'function';
}

export function isCloneable<T>(value: unknown): value is Cloneable<T> {
  return isObject(value) && 'clone' in value && typeof value.clone === 'function';
}

/**
 * A function that does nothing, similar to `noop` in other libraries but more descriptive.
 */
export function ignore(...args: any): void {
}

/**
 * A function that simply returns the given value, similar to `identity` in other libraries but more descriptive.
 */
export function passThrough<T>(value: T): T {
  return value;
}

/**
 * Creates a {@link Predicate} that returns true for the given value.
 */
export function equals<T>(value: T): Predicate<T> {
  return v => v === value;
}

/**
 * Deep strict equality check for plain objects, arrays, and primitives.
 */
export function areEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (!isObject(a) || !isObject(b)) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.length === 0 || a.every((v, i) => areEqual(v, b[i]));
  }

  const keysA = Object.keys(a) as Array<keyof typeof a>;
  const keysB = Object.keys(b) as Array<keyof typeof b>;
  if (keysA.length !== keysB.length) return false;

  return keysA.every(k => areEqual(a[k], b[k]));
}

/**
 * Returns true if the given value is either a number or a numeric string.
 */
export function isNumeric(value: unknown): value is number {
  if (typeof value === 'number') return true;
  if (typeof value !== 'string' || isBlank(value)) return false;
  return !isNaN(Number(value));
}
