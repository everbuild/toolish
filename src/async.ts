import { isObject } from './object';

/**
 * The missing Promise executor type.
 */
export type PromiseExecutor<T> = ConstructorParameters<typeof Promise<T>>[0];

/**
 * The missing Promise resolve function type.
 */
export type ResolvePromise<T> = Parameters<PromiseExecutor<T>>[0];

/**
 * The missing Promise reject function type.
 */
export type RejectPromise = Parameters<PromiseExecutor<never>>[1];

export type MaybePromise<T> = T | Promise<T>;

export type MaybePromiseLike<T> = T | PromiseLike<T>;

export function isPromiseLike<T = unknown>(value: MaybePromiseLike<T>): value is PromiseLike<T> {
  return isObject(value) && typeof value.then === 'function';
}

/**
 * Promise wrapper that allows resolve and reject to be called externally
 * @see {@link !Promise}
 */
export class Deferred<T> {
  promise: Promise<T>;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  /**
   * Resolve the underlying promise
   */
  resolve!: ResolvePromise<T>;

  /**
   * Reject the underlying promise
   */
  reject!: RejectPromise;
}
