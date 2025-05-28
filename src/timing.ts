import { Deferred, MaybePromiseLike } from './async';
import { CancelError, ignore, Resource, ReusableResource } from './general';
import { Consumer, GenericFunction, Producer } from './types';

/**
 * The missing `setTimeout` return type.
 */
export type TimeoutHandle = ReturnType<typeof setTimeout>;

/**
 * The missing `setInterval` return type.
 */
export type IntervalHandle = ReturnType<typeof setInterval>;

/**
 * Shorthand to create a promise that resolves after the given milliseconds.
 * @see {@link Delay}
 */
export function delay(ms: number): Promise<void> {
  return new Delay(ms).promise;
}

/**
 * Wraps a promise that resolves after the given milliseconds.
 * Uses `setTimeout`, so the same [delay inaccuracies](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#reasons_for_delays_longer_than_specified) apply.
 */
export class Delay extends Deferred<void> implements Resource {
  private handle?: TimeoutHandle;

  constructor(ms: number) {
    super();
    this.handle = setTimeout(this.resolve, ms);
  }

  /**
   * Shorthand to run the given action when the promise resolves.
   */
  then(action: Producer<MaybePromiseLike<unknown>>, onError: Consumer<any> = ignore): this {
    this.promise.then(action, onError);
    return this;
  }

  /**
   * Aborts the timeout by resolving the promise.
   */
  flush(): void {
    if (this.handle) {
      this.abort();
      this.resolve();
    }
  }

  /**
   * Aborts the timeout by rejecting the promise.
   */
  cancel(reason: any = new CancelError()): void {
    if (this.handle) {
      this.abort();
      this.reject(reason);
    }
  }

  free(): void {
    this.cancel();
  }

  private abort(): void {
    clearTimeout(this.handle);
    this.handle = undefined;
  }
}

/**
 * Convenience wrapper for `setInterval`.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval
 * Uses `setInterval`, so the same [delay restrictions](https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval#delay_restrictions) apply.
 */
export class Interval implements Resource {
  private handle: IntervalHandle;
  private limit = Number.POSITIVE_INFINITY;

  /**
   * Runs action every ms milliseconds.
   * CAUTION: If the given action callback throws an error, the interval is cancelled to avoid excessive error logging.
   * @param ms      target delay
   * @param action  called after each delay
   */
  constructor(ms: number, action: Producer<MaybePromiseLike<unknown>>) {
    this.handle = setInterval(async () => {
      try {
        await action();
        if (--this.limit <= 0) this.cancel();
      } catch (e) {
        this.cancel();
        console.error('interval cancelled due to error', e);
      }
    }, ms);
  }

  /**
   * limits the number of invocations
   */
  withLimit(limit: number): this {
    this.limit = limit;
    return this;
  }

  cancel(): void {
    clearInterval(this.handle);
  }

  free(): void {
    this.cancel();
  }
}

/**
 * A mechanism that defers function calls until no calls are received during a given interval.
 */
export class Debounce<T, P extends Array<any>> implements ReusableResource {
  private pending = false;
  private deferred?: Deferred<T>;
  private delay?: Delay;
  private parameters?: P;

  /**
   * @param ms delay in milliseconds
   * @param action underlying function
   */
  constructor(
    private ms: number,
    private action: GenericFunction<P, MaybePromiseLike<T>>,
  ) {}

  /**
   * Schedule a call to the underlying function with the given parameters.
   * If subsequent calls are made within the same interval, this call and its parameters are discarded.
   */
  run(...parameters: P): Promise<T> {
    this.parameters = parameters;
    if (!this.pending) {
      this.deferred = new Deferred();
      this.pending = true;
    }
    this.delay?.cancel();
    this.delay = new Delay(this.ms).then(() => this.doRun());
    return this.deferred!.promise;
  }

  /**
   * If a call is currently scheduled, execute it immediately
   */
  flush(): void {
    this.delay?.flush();
  }

  /**
   * Cancel any scheduled call
   */
  cancel(reason: any = new CancelError()): void {
    if (!this.pending) return;
    this.delay?.cancel(reason);
    this.deferred?.reject(reason);
    this.pending = false;
  }

  free(): void {
    this.cancel();
  }

  private doRun(): void {
    if (!this.pending) return;
    try {
      const result = this.action(...this.parameters!);
      this.deferred?.resolve(result);
    } catch (error) {
      this.deferred?.reject(error);
    } finally {
      this.pending = false;
    }
  }
}