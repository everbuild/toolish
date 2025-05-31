import { Cloneable } from '../general';
import { MaybeReactive, Reactive } from './base';
import { ReactiveFactory } from './internal';

export type PatchSource<T> = T extends Reactive<infer V> ? PatchSource<V> : T extends Array<infer E> ? Array<PatchSource<E>> : T extends object ? { [K in keyof T]: PatchSource<T[K]> } : MaybeReactive<T>;

/**
 * Wraps any value, but primarily intended for primitives.
 * There are specialized subclasses for {@link ReactiveObject | objects} and {@link ReactiveArray | arrays}.
 */
export class ReactiveValue<T> extends Reactive<T> implements Cloneable<ReactiveValue<T>> {
  /**
   * Creates a new ReactiveValue with an initial value.
   * @see {@link of} if your value may already be reactive or reuse a cached reactive value.
   * @see {@link nest} to also convert nested array elements or object properties.
   */
  constructor(
    protected value: T,
  ) {
    super();
  }

  unwrap(): T {
    return this.value;
  }

  /**
   * Replaces the underlying value.
   *
   * If the new value is strictly equal to the current value, it is ignored.
   * For this and other reasons, {@link patch} is often more appropriate for non-primitives.
   *
   * @remarks
   * In case you want to mutate the exising unwrapped value without producing a new one, you're free to do so.
   * Just make sure to manually call {@link updateSubscribers} afterward to trigger reactive updates.
   *
   * E.g.:
   * ```javascript
   * someMutation(reactiveValue.unwrap());
   * reactiveValue.updateSubscribers();
   * ```
   */
  set(value: T): void {
    if (value === this.value) return;
    this.value = value;
    this.updateSubscribers();
  }

  /**
   * Attempts to perform a partial update of the underlying value based on the differences with the given value.
   * This base implementation just calls {@link set} but is overridden in subclasses to provide more specialized implementations.
   * Generally, they apply the patch logic recursively to any nested values in the entire graph.
   *
   * The main advantages of patch are that resulting reactive updates are reduced to where they're really needed
   * and potentially lower memory overhead due to less unnecessary derivations.
   *
   * @see {@link ReactiveObject.patch} and {@link ReactiveArray.patch}
   */
  patch(source: PatchSource<T>): void {
    this.set(Reactive.unwrap(source, Reactive.NO_TRACK) as T);
  }

  clone(): ReactiveValue<T> {
    return new ReactiveValue<T>(this.value);
  }
}

ReactiveFactory.value = v => new ReactiveValue(v);