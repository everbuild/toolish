import { mirrorIndex } from '../array';
import { Cancel, passThrough } from '../general';
import { isObject, mapProperties } from '../object';
import { Consumer, GenericFunction, isPresent, Transformation } from '../types';
import type { ElementFactory, ReactiveArray } from './array';
import { ReactiveCache, WeakReactiveCache } from './cache';
import { ReactiveConsumer } from './consumer';
import type { ComponentFactory } from './container';
import type { Derivation, ReactiveDerivative } from './derivative';
import { NO_CACHE, NO_TRACK, ReactiveFactory } from './internal';
import type { ReactiveObject } from './object';
import type { Publisher, Subscriber, SubscriptionTracker } from './publisher';
import type { ReactiveValue } from './value';

export type MaybeReactive<T> = T | Reactive<T>;

export type Unreactive<T> = T extends Reactive<infer V> ? Unreactive<V> : T;

export type ReactiveVariant<T> = T extends Reactive<any> ? T : T extends Array<infer E> ? ReactiveArray<E> : T extends object ? ReactiveObject<{ [K in keyof T]: T[K] }> : ReactiveValue<T>;

export type UnreactiveNested<T> = T extends Reactive<infer V> ? UnreactiveNested<V> : T extends Array<infer E> ? Array<UnreactiveNested<E>> : T extends object ? { [K in keyof T]: UnreactiveNested<T[K]> } : T;

/**
 * Like {@link !types.Transformation} but also gets passed a {@link SubscriptionTracker} that
 * should be used whenever additional {@link Reactive} values are depended on.
 */
export type ReactiveTransformation<T, R> = GenericFunction<[T, SubscriptionTracker], R>;

/**
 * Base class representing a reactive entity.
 */
export abstract class Reactive<T> implements Publisher {
  static DIRECT_CACHE = new WeakReactiveCache();
  static NESTED_CACHE = new WeakReactiveCache();
  static NO_CACHE = NO_CACHE;
  static NO_TRACK = NO_TRACK;

  private subscribers = new Set<Subscriber>();

  /**
   * Like {@link Reactive.of:VALUE} but just expresses that any already reactive value is returned as is.
   */
  static of<T extends Reactive<any>>(source: T): T;

  /**
   * Like {@link Reactive.of:VALUE} but wraps an array as a {@link ReactiveArray}.
   * {@label ARRAY}
   */
  static of<T>(source: Array<T>, cache?: ReactiveCache): ReactiveArray<T>;

  /**
   * Like {@link Reactive.of:ARRAY} but allows specifying how elements are created.
   */
  static of<T>(source: Array<T>, createElement: ElementFactory<T>, cache?: ReactiveCache): ReactiveArray<T>;

  /**
   * Like {@link Reactive.of:VALUE} but wraps an object as a {@link ReactiveObject}.
   * {@label OBJECT}
   */
  static of<T extends object>(source: T, cache?: ReactiveCache): ReactiveObject<T>;

  /**
   * Like {@link Reactive.of:OBJECT} but allows specifying how property values are created.
   */
  static of<T extends object>(source: T, createProperty: ComponentFactory<T>, cache?: ReactiveCache): ReactiveObject<T>;

  /**
   * Wraps the given value as a {@link ReactiveValue}.
   * If the cache already contains a reactive counterpart, that is recycled instead.
   * {@label VALUE}
   *
   * @param source original value
   * @param cache pass a custom {@link ReactiveCache} or {@link Reactive.NO_CACHE} to disable caching. Default: {@link Reactive.DIRECT_CACHE}
   */
  static of<T>(source: T, cache?: ReactiveCache): ReactiveValue<T>;

  static of(source: any, ...rest: Array<any>): any {
    if (source instanceof Reactive) return source;
    const cache: ReactiveCache = rest.pop() || Reactive.DIRECT_CACHE;
    const createComponent = rest.pop() || passThrough;
    let result = cache.get(source);
    if (!result) {
      if (Array.isArray(source)) {
        result = ReactiveFactory.array(source, createComponent);
      } else if (isObject(source)) {
        result = ReactiveFactory.object(source, createComponent);
      } else {
        result = ReactiveFactory.value(source);
      }
      cache.set(source, result);
    }
    return result;
  }

  /**
   * Like {@link Reactive.nest:OBJECT} but just expresses that any already reactive value is returned as is, without nesting.
   */
  static nest<T extends Reactive<any>>(source: T): T;

  /**
   * Like {@link Reactive.nest:OBJECT} but for arrays.
   * {@label ARRAY}
   */
  static nest<T>(source: Array<T>, arrayCache?: ReactiveCache, elementCache?: ReactiveCache): ReactiveArray<ReactiveVariant<T>>;

  /**
   * Like {@link Reactive.of:OBJECT} but also makes all properties reactive.
   * Useful for improving {@link ReactiveValue.patch | patch performance}.
   * {@label OBJECT}
   *
   * Note that this is limited to direct properties only, any nested values are left as is.
   *
   * Since the root object and properties are transformed differently, you can provide a separate cache for both.
   * By default, {@link Reactive.NESTED_CACHE} is used for the root object and {@link Reactive.DIRECT_CACHE} for the properties.
   */
  static nest<T extends object>(source: T, objectCache?: ReactiveCache, propertyCache?: ReactiveCache): ReactiveObject<{ [K in keyof T]: ReactiveVariant<T[K]> }>;

  static nest(source: any, parentCache = this.NESTED_CACHE, childCache?: ReactiveCache): any {
    if (source instanceof Reactive) return source;
    let result = parentCache.get(source);
    if (!result) {
      const componentFactory = (v: any) => Reactive.of(v, childCache);
      const nested: any = Array.isArray(source) ? source.map(componentFactory) : mapProperties(source, componentFactory);
      result = Reactive.of(nested, componentFactory, NO_CACHE);
      parentCache.set(source, result);
    }
    return result;
  }

  /**
   * Deeply unwraps the given value.
   * This means that the value is {@link Reactive.unwrap:instance | unwrapped} if it is {@link Reactive}, otherwise it is returned as is.
   * This is then repeated as long as needed until an unreactive value is found.
   * {@label STATIC}
   */
  static unwrap<T>(value: T, tracker: SubscriptionTracker): Unreactive<T> {
    while (value instanceof Reactive) value = value.get(tracker);
    return value as any;
  }

  /**
   * {@link Reactive.unwrap:STATIC | Unwraps} the given value and any deeply nested properties or array elements.
   * {@label STATIC}
   */
  static unnest<T>(value: T, tracker: SubscriptionTracker): UnreactiveNested<T>;
  static unnest(value: any, tracker: SubscriptionTracker): any {
    if (value instanceof Reactive) return Reactive.unnest(value.get(tracker), tracker);
    if (Array.isArray(value)) return value.map(v => Reactive.unnest(v, tracker));
    if (isObject(value)) return mapProperties(value, v => Reactive.unnest(v, tracker));
    return value;
  }

  /**
   * Factory function to create a {@link ReactiveDerivative}.
   * {@label STATIC}
   * @see {@link Reactive.derive:STATIC_MAYBE}
   * @see {@link Reactive.derive:INSTANCE}
   */
  static derive<T>(derivation: Derivation<T>): ReactiveDerivative<T>;

  /**
   * Convenience function that allows passing a value that is optionally reactive.
   * Calls {@link Reactive.derive:INSTANCE} if the given value is reactive, otherwise applies the transformation directly.
   * {@label STATIC_MAYBE}
   * @see {@link Reactive.derive:STATIC}
   * @see {@link Reactive.derive:INSTANCE}
   */
  static derive<T, R>(value: MaybeReactive<T>, transform: ReactiveTransformation<T, R>): MaybeReactive<R>;

  static derive(subject: any, transform?: any): any {
    if (transform) {
      if (subject instanceof Reactive) return subject.derive(transform);
      else return transform(subject, NO_TRACK);
    } else {
      return ReactiveFactory.derivative(subject);
    }
  }

  /**
   * Convenience function that converts an array of optionally reactive values into an optionally reactive array.
   * The result is reactive if one of the given values is reactive, otherwise the given array is returned as is.
   * {@label BASIC}
   */
  static combine<T>(values: Array<MaybeReactive<T>>): MaybeReactive<Array<T>>;

  /**
   * Like {@link Reactive.combine:BASIC}, but allows passing a function that transforms the array of unwrapped values into something else.
   * Effectively a shorthand for `Reactive.derive(Reactive.combine(values), transform)`.
   * NOTE if none of the given values is reactive, transform is applied to the original array.
   */
  static combine<T, R>(values: Array<MaybeReactive<T>>, transform: Transformation<Array<T>, R>): MaybeReactive<R>;

  static combine(values: Array<any>, transform: ReactiveTransformation<any, any> = passThrough): Array<any> | Reactive<any> {
    if (values.some(v => v instanceof Reactive)) {
      return Reactive.derive(t => {
        const rawValues = values.map(v => Reactive.unwrap(v, t));
        return Reactive.unwrap(transform(rawValues, t), t);
      });
    } else {
      return transform(values, NO_TRACK);
    }
  }

  /**
   * Convenience function that allows passing a value that is optionally reactive.
   * Calls {@link Reactive.consume:INSTANCE} if the value is reactive, otherwise calls the consumer directly.
   * {@label STATIC}
   */
  static consume<T>(value: T, consumer: Consumer<Unreactive<T>>): Cancel | undefined {
    if (value instanceof Reactive) return value.consume(consumer);
    else consumer(value as any);
  }

  /**
   * Reactively consume the underlying value.
   * {@label INSTANCE}
   * @param consumer function called immediately with the current value and then whenever the value is updated.
   * @returns a function to stop calling the consumer and free up associated resources.
   * @see {@link Reactive.consume:STATIC}
   */
  consume(consumer: Consumer<T>): Cancel {
    const rc = new ReactiveConsumer(this, consumer);
    return () => rc.free();
  }

  /**
   * Reactively {@link Reactive.unwrap:INSTANCE | unwrap} the underlying value, creating a subscription to track its dependants using the given tracker.
   * Important in a {@link ReactiveDerivative}.
   */
  get(tracker: SubscriptionTracker): T {
    tracker.subscribeTo(this);
    return this.unwrap();
  }

  /**
   * Returns the current underlying value without tracking dependencies.
   * Use {@link Reactive.get} if you need reactivity.
   * {@label INSTANCE}
   */
  abstract unwrap(): T;

  /**
   * {@link Reactive.unnest:STATIC Unnest} this instance.
   */
  unnest(tracker: SubscriptionTracker): UnreactiveNested<T> {
    return Reactive.unnest(this as Reactive<T>, tracker);
  }

  /**
   * Creates a {@link ReactiveDerivative} that transforms the underlying value to something else.
   * {@label INSTANCE}
   * @param transform function that receives the underlying value and produces a new one.
   * @see {@link Reactive.derive:STATIC}
   * @see {@link Reactive.derive:STATIC_MAYBE}
   */
  derive<R>(transform: ReactiveTransformation<T, R>): ReactiveDerivative<R> {
    return Reactive.derive(t => transform(this.get(t), t));
  }

  /**
   * Creates a {@link ReactiveDerivative} that contains the property with the given name when the underlying value is an object,
   * or the element at the given index when the underlying value is an array.
   * You can use a negative index to {@link array!mirrorIndex | count back from the end}.
   * {@label ONE}
   *
   * @remarks
   * * Performing this on a value that is not indexable (a primitive) results in a runtime error.
   *   TypeScript prevents this at compile time, there are no additional checks at runtime.
   * * An invalid property name yields `undefined`.
   *   TypeScript prevents this at compile time, there are no additional checks at runtime.
   * * An out-of-bounds index also yields `undefined`.
   *   **TypeScript does not normally prevent this** at compile time as it hides the potential `undefined`!
   *   There are also no additional checks at runtime because this may be intentional.
   *   If you expect an index to be valid you can ensure this with something like `...select(101).derive(expectPresent)`.
   *
   *  @param key property name or index
   */
  select<K extends keyof T>(key: K): ReactiveDerivative<T[K]>;

  /**
   * {@link Reactive.select:ONE | Select} 2 levels deep
   */
  select<K1 extends keyof T, T2 extends Unreactive<T[K1]>, K2 extends keyof T2>(key1: K1, key2: K2): ReactiveDerivative<T2[K2]>;

  /**
   * {@link Reactive.select:ONE | Select} 3 levels deep
   */
  select<K1 extends keyof T, T2 extends Unreactive<T[K1]>, K2 extends keyof T2, T3 extends Unreactive<T2[K2]>, K3 extends keyof T3>(key1: K1, key2: K2, key3: K3): ReactiveDerivative<T3[K3]>;

  /**
   * {@link Reactive.select:ONE | Select} 4 levels deep
   */
  select<K1 extends keyof T, T2 extends Unreactive<T[K1]>, K2 extends keyof T2, T3 extends Unreactive<T2[K2]>, K3 extends keyof T3, T4 extends Unreactive<T3[K3]>, K4 extends keyof T4>(key1: K1, key2: K2, key3: K3, key4: K4): ReactiveDerivative<T4[K4]>;

  /**
   * {@link Reactive.select:ONE | Select} 5 levels deep
   */
  select<K1 extends keyof T, T2 extends Unreactive<T[K1]>, K2 extends keyof T2, T3 extends Unreactive<T2[K2]>, K3 extends keyof T3, T4 extends Unreactive<T3[K3]>, K4 extends keyof T4, T5 extends Unreactive<T4[K4]>, K5 extends keyof T5>(key1: K1, key2: K2, key3: K3, key4: K4, key5: K5): ReactiveDerivative<T5[K5]>;

  /**
   * {@link Reactive.select:ONE | Select} more than 5 levels deep without type checking.
   * Consider combining multiple selects with a maximum depth of 5 instead.
   */
  select(...keys: Array<keyof any>): ReactiveDerivative<unknown>;

  select(...keys: Array<keyof any>): ReactiveDerivative<any> {
    return Reactive.derive(t => {
      let value: any = this;
      for (const key of keys) {
        value = Reactive.unwrap(value, t);
        if (Array.isArray(value)) {
          value = value[mirrorIndex(Number(key), value.length)];
        } else if (isPresent(value)) {
          value = value[key];
        } else {
          throw new Error(`invalid selection: ${keys.join(' / ')}`);
        }
      }
      return value;
    });
  }

  subscribe(subscriber: Subscriber): void {
    this.subscribers.add(subscriber);
  }

  unsubscribe(subscriber: Subscriber): void {
    this.subscribers.delete(subscriber);
  }

  /**
   * Let subscribers (reactive dependants) know that this value has changed.
   * Make sure to always call this after manually mutating a reactive value.
   * Mutations through {@link ReactiveValue.set} and other library APIs do this for you.
   *
   * Note that not all reactive values are expected to be mutated directly.
   * {@link ReactiveValue} and its subclasses are, but {@link ReactiveDerivative} is not!
   *
   * @example
   * ```
   * someMutation(reactiveValue.unwrap());
   * reactiveValue.updateSubscribers();
   * ```
   */
  updateSubscribers(): void {
    // iterate over a copy because the subscriber set may get modified as a result of the update!
    const initial = [...this.subscribers];
    initial.forEach(u => u.update());
  }

  hasSubscribers(): boolean {
    return this.subscribers.size > 0;
  }

  valueOf(): T {
    return this.unwrap();
  }

  toString(): string {
    return `reactive(${JSON.stringify(this.unnest(Reactive.NO_TRACK))})`;
  }
}