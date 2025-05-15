import { areEqual, Cancel, Cloneable, passThrough, Resource } from './general';
import { isObject, mapProperties } from './object';
import { Consumer, Transformation } from './types';

/**
 * @file Simple, explicit, push-based reactivity system.
 */

export type MaybeReactive<T> = T | Reactive<T>;

export type ReactiveNested<T> = T extends Array<infer E> ? ReactiveArray<ReactiveNested<E>> : T extends object ? ReactiveObject<{ [K in keyof T]: ReactiveNested<T[K]> }> : ReactiveValue<T>;

export type UnreactiveNested<T> = T extends Reactive<infer V> ? UnreactiveNested<V> : T extends Array<infer E> ? Array<UnreactiveNested<E>> : T extends object ? { [K in keyof T]: UnreactiveNested<T[K]> } : T;

export type UnreactiveDeep<T> = T extends Reactive<infer V> ? UnreactiveDeep<V> : T;

export type Selection<T, K extends keyof T> = T extends Array<any> | object ? T[K] : undefined;

export interface Derivation<T> {
  (tracker: SubscriptionTracker): T;
}

export interface PropertyRemover<T> {
  (value: T, key: keyof T): void;
}

interface Publisher {
  subscribe(subscriber: Subscriber): void;

  unsubscribe(subscriber: Subscriber): void;

  updateSubscribers(): void;

  hasSubscribers(): boolean;
}

interface Subscriber {
  update(): void;
}

interface SubscriptionTracker {
  subscribeTo(publisher: Publisher): void;
}

export interface ReactiveCache {
  set(raw: any, reactive: Reactive<any>): void;

  get(raw: any): Reactive<any> | undefined;
}

/**
 * {@link ReactiveCache} implementation that only caches objects using a {@link WeakMap}.
 * Requests to store other types of values are ignored.
 */
export class WeakReactiveCache implements ReactiveCache {
  private map = new WeakMap<WeakKey, Reactive<any>>();

  set(raw: any, reactive: Reactive<any>): void {
    if (this.supports(raw)) this.map.set(raw, reactive);
  }

  get(raw: any): Reactive<any> | undefined {
    const reactive = this.supports(raw) && this.map.get(raw);
    if (reactive) {
      if (areEqual(raw, reactive.unwrapNested())) return reactive;
      this.map.delete(raw);
    }
  }

  private supports(raw: any): raw is WeakKey {
    return isObject(raw);
  }
}

/**
 * {@link ReactiveCache} implementation that doesn't cache anything.
 * Used to disable caching while retaining a consistent API.
 */
export class NullReactiveCache implements ReactiveCache {
  static DEFAULT = new NullReactiveCache();

  set(raw: any, reactive: Reactive<any>): void {
  }

  get(raw: any): undefined {
  }
}

class ReactiveConsumer<T> implements Subscriber, Resource {
  constructor(
    private base: Reactive<T>,
    private consumer: Consumer<T>,
  ) {
    this.base.subscribe(this);
    this.update();
  }

  update(): void {
    this.consumer(this.base.unwrap());
  }

  free() {
    this.base.unsubscribe(this);
  }
}

/**
 * Base class representing a reactive value.
 * As a main API entry-point, it provides a number of static factory functions to convert between normal and appropriate reactive values.
 */
export abstract class Reactive<T> implements Publisher {
  static UNNESTED_CACHE = new WeakReactiveCache();
  static NESTED_CACHE = new WeakReactiveCache();

  private subscribers = new Set<Subscriber>();

  /**
   * Returns a ReactiveValue for the given value if it is not already reactive, otherwise it is returned as is.
   * If the cache already contains a reactive counterpart, that is reused instead.
   * @param source
   * @param cache pass false to disable caching or a custom {@link ReactiveCache}
   */
  static of<T>(source: T, cache: ReactiveCache | false = Reactive.UNNESTED_CACHE): T extends Reactive<any> ? T : ReactiveValue<T> {
    return Reactive.wrap(source, false, cache || NullReactiveCache.DEFAULT);
  }

  /**
   * Like {@link #of}, but if the given value is an array or object, its elements or properties are also converted.
   * If these are themselves arrays or objects, the same logic is applied, and so on until the entire graph is reactive.
   */
  static nest<T>(source: T, cache: ReactiveCache | false = Reactive.NESTED_CACHE): T extends Reactive<any> ? T : ReactiveNested<T> {
    return Reactive.wrap(source, true, cache || NullReactiveCache.DEFAULT);
  }

  private static wrap(source: any, nest: boolean, cache: ReactiveCache): any {
    if (source instanceof Reactive) return source;
    let result = cache.get(source);
    if (!result) {
      if (nest && Array.isArray(source)) {
        result = new ReactiveArray(source.map(v => ReactiveValue.wrap(v, nest, cache)));
      } else if (nest && isObject(source)) {
        result = new ReactiveObject(mapProperties(source, v => ReactiveValue.wrap(v, nest, cache)));
      } else {
        result = new ReactiveValue(source);
      }
      cache.set(source, result);
    }
    return result;
  }

  /**
   * Convenience function to create a {@link ReactiveDerivation}.
   */
  static derive<T>(derivation: Derivation<T>): ReactiveDerivation<T> {
    return new ReactiveDerivation(derivation);
  }

  /**
   * {@link #unwrap Unwraps} the given value if it is reactive.
   * If the resulting value is also reactive it is also unwrapped, and so on.
   * Optionally pass in a {@link SubscriptionTracker} to track reactivity.
   * WARNING: bypasses reactivity if no tracker is provided!
   * @see #flatten for a similar operation.
   */
  static unwrap<T>(value: T, tracker?: SubscriptionTracker): UnreactiveDeep<T> {
    while (value instanceof Reactive) {
      tracker?.subscribeTo(value);
      value = value.unwrap();
    }
    return value as any;
  }

  /**
   * {@link #unwrap Unwraps} the given value if it is reactive and any nested properties or elements in case of an object or array respectively.
   * WARNING: bypasses reactivity!
   */
  static unwrapNested<T>(value: T): UnreactiveNested<T>;
  static unwrapNested(value: any): any {
    if (value instanceof Reactive) return Reactive.unwrapNested(value.unwrap());
    if (Array.isArray(value)) return value.map(Reactive.unwrapNested);
    if (isObject(value)) return mapProperties(value, Reactive.unwrapNested);
    return value;
  }

  /**
   * Convenience function that allows passing a value that is optionally reactive.
   * Calls {@link #map} if the value is reactive, otherwise applies the transformation directly.
   */
  static map<T, R>(value: MaybeReactive<T>, transform: Transformation<T, R>): MaybeReactive<R> {
    if (value instanceof Reactive) return value.map(transform) as any;
    else return transform(value);
  }

  /**
   * Convenience function that converts an array of optionally reactive values into a single reactive value with an array of unwrapped values.
   * If none of the given values is reactive, the array is returned as is.
   */
  static combine<T>(values: Array<MaybeReactive<T>>): MaybeReactive<Array<T>>;

  /**
   * Like {@link #combine} with a single argument, but allows passing a function that transforms the array of unwrapped values into something else.
   * Effectively a shorthand for `Reactive.map(Reactive.combine(values), transform)`.
   * NOTE if none of the given values is reactive, transform is applied to the original array.
   */
  static combine<T, R>(values: Array<MaybeReactive<T>>, transform: Transformation<Array<T>, R>): MaybeReactive<R>;

  static combine(values: Array<any>, transform: Transformation<any, any> = passThrough): Array<any> | Reactive<Array<any>> {
    if (values.some(v => v instanceof Reactive)) {
      return Reactive.derive(t => {
        const rawValues = values.map(v => Reactive.unwrap(v, t));
        return Reactive.unwrap(transform(rawValues), t);
      });
    } else {
      return transform(values);
    }
  }

  /**
   * Convenience function that allows passing a value that is optionally reactive.
   * Calls {@link #consume} if the value is reactive, otherwise calls the consumer directly.
   */
  static consume<T>(value: MaybeReactive<T>, consumer: Consumer<T>): Cancel | undefined {
    if (value instanceof Reactive) return value.consume(consumer);
    else consumer(value);
  }

  /**
   * Convenience function that {@link #unwrap unwraps} the underlying value and creates a subscription using the given tracker.
   * Mostly useful in a {@link #ReactiveDerivation}.
   * @param tracker
   */
  get(tracker: SubscriptionTracker): T;

  /**
   * Convenience alias for {@link #consume}.
   * @param consumer
   */
  get(consumer: Consumer<T>): Cancel;

  /**
   * Convenience alias for {@link #select}.
   */
  get<K extends keyof T>(key: K): ReactiveDerivation<UnreactiveDeep<Selection<T, K>>>;

  get(subject: any): any {
    switch (typeof subject) {
      case 'function':
        return this.consume(subject);
      case 'number':
      case 'string':
        return this.select(subject as any);
    }
    subject.subscribeTo(this);
    return this.unwrap();
  }

  /**
   * Consume the underlying value in a reactive way.
   * @param consumer callback that will be called immediately with the current value and whenever the value is updated.
   * @returns a function to stop calling the consumer and free up associated resources.
   */
  consume(consumer: Consumer<T>): Cancel {
    const e = new ReactiveConsumer(this, consumer);
    return () => e.free();
  }

  /**
   * Returns the current underlying value.
   * WARNING: bypasses reactivity, you usually want to use {@link #get} instead!
   */
  abstract unwrap(): T;

  /**
   * Calls {@link Reactive#unwrapNested} with this value.
   */
  unwrapNested(): UnreactiveNested<T> {
    return Reactive.unwrapNested(this as Reactive<T>);
  }

  /**
   * Creates a {@link ReactiveDerivation} that transforms the underlying value to something else.
   * This only allows using the current ReactiveValue as a source, if you need multiple reactive sources use {@link #derive} instead.
   * If the transform function returns a reactive value it's unwrapped automatically similar to {@link #flatten}.
   * @param transform function that receives the underlying value and produces a new one.
   */
  map<R>(transform: Transformation<T, R>): ReactiveDerivation<UnreactiveDeep<R>> {
    return new ReactiveDerivation(t => Reactive.unwrap(transform(this.get(t)), t));
  }

  /**
   * Creates a {@link ReactiveDerivation} that contains the property with the given name when the underlying value is an object,
   * or the element at the given index when the underlying value is an array.
   * A negative index can be used to count back from the end (e.g. -1 = last element).
   * An index or property name that is otherwise invalid (out of range) yields undefined.
   * When the underlying value is neither an object nor an array, the resulting ReactiveDerivation also yields undefined.
   * If the selected value is reactive it's unwrapped automatically similar to {@link #flatten}.
   * Note that (although not recommended) it is possible for the underlying value type to change between object, array or anything else,
   * the resulting ReactiveDerivation will react accordingly.
   * @param key property name or index
   */
  select<K extends keyof T>(key: K): ReactiveDerivation<UnreactiveDeep<Selection<T, K>>> {
    return this.map(value => {
      if (Array.isArray(value)) {
        let i = key as number;
        if (i < 0) i += value.length;
        return value[i];
      }
      if (isObject(value)) {
        return value[key];
      }
    });
  }

  /**
   * Creates a {@link ReactiveDerivation} that discards any redundant underlying reactive values.
   * I.e. when the underlying value is itself reactive, its underlying value is used, and so on.
   */
  flatten(): ReactiveDerivation<UnreactiveDeep<T>> {
    return this.map(passThrough);
  }

  subscribe(subscriber: Subscriber): void {
    this.subscribers.add(subscriber);
  }

  unsubscribe(subscriber: Subscriber): void {
    this.subscribers.delete(subscriber);
  }

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
    return `reactive(${JSON.stringify(this.unwrapNested())})`;
  }
}

export class ReactiveValue<T> extends Reactive<T> implements Cloneable<ReactiveValue<T>> {
  /**
   * Creates a new ReactiveValue with an initial value.
   * @see #of if your value may already be reactive or reuse a cached reactive value.
   * @see #nest to also convert nested array elements or object properties.
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
   * Replaces the entire underlying value.
   * This is mostly appropriate for primitive types, see {@link #patch} for a more efficient way of updating arrays and objects.
   * NOTE that this has no effect if the underlying value is already strictly equal to the given value.
   */
  set(value: T): void {
    if (value === this.value) return;
    this.value = value;
    this.updateSubscribers();
  }

  /**
   * Attempts to perform a partial update of the underlying value based on the differences with the given value.
   * This base implementation just calls {@link #set} but is overridden in subclasses to provide more specialized implementations.
   * Generally, they apply the patch logic recursively to any nested values in the entire graph.
   * The main advantages of patch are that update handling is restricted to where it's really needed and reduced memory overhead.
   * @param source unreactive source value to use
   * @param cache cache to use when {@link Reactive#nest resolving nested values}
   * @see ReactiveObject#patch
   * @see ReactiveArray#patch
   */
  patch(source: UnreactiveNested<T>, cache?: ReactiveCache): void {
    this.set(source as T);
  }

  clone(): ReactiveValue<T> {
    return new ReactiveValue<T>(this.value);
  }
}

abstract class ReactiveComplexValue<T> extends ReactiveValue<T> {
  protected dirty = false;

  protected setComponent<K extends keyof T>(key: K, value: any, cache?: ReactiveCache): void {
    const existing = this.value[key];
    if (existing instanceof ReactiveValue) {
      existing.patch(value, cache);
    } else {
      this.value[key] = Reactive.nest(value, cache);
      this.dirty = true;
    }
  }

  protected commit(): void {
    if (this.dirty) {
      this.updateSubscribers();
      this.dirty = false;
    }
  }
}

export class ReactiveObject<T extends Record<any, ReactiveValue<any>>> extends ReactiveComplexValue<T> {
  /**
   * Defines how properties are removed. By default, they're assigned to `undefined`.
   */
  static REMOVAL_STRATEGY: PropertyRemover<any> = (o, k) => o[k] = undefined;

  /**
   * Patches, adds or removes properties as needed to match the given source object.
   * @see #REMOVAL_STRATEGY to tweak how properties are removed.
   * @see ReactiveValue#patch for more details.
   */
  patch(source: UnreactiveNested<T>, cache?: ReactiveCache): void {
    const allKeys = Object.keys({ ...this.value, ...source }) as Array<keyof T>;
    allKeys.forEach(k => k in source ? this.setComponent(k, source[k], cache) : this.removeComponent(k));
    this.commit();
  }

  setProperty<K extends keyof T>(key: K, value: UnreactiveNested<T[K]>, cache?: ReactiveCache): void {
    this.setComponent(key, value, cache);
    this.commit();
  }

  removeProperty(key: keyof T): void {
    this.removeComponent(key);
    this.commit();
  }

  private removeComponent(key: keyof T): void {
    if (key in this.value) {
      ReactiveObject.REMOVAL_STRATEGY(this.value, key);
      this.dirty = true;
    }
  }

  clone(): ReactiveObject<T> {
    return new ReactiveObject(this.value);
  }
}

export class ReactiveArray<T extends ReactiveValue<any>> extends ReactiveComplexValue<Array<T>> {
  /**
   * Patches, adds or removes elements as needed to match the given source array.
   * @see ReactiveValue#patch for more details.
   */
  patch(source: Array<UnreactiveNested<T>>, cache?: ReactiveCache): void {
    source.forEach((v, i) => this.setComponent(i, v, cache));
    this.truncate(source.length);
    this.commit();
  }

  addLast(...values: Array<UnreactiveNested<T>>): void {
    this.splice(this.value.length, 0, values);
  }

  addFirst(...values: Array<UnreactiveNested<T>>): void {
    this.splice(0, 0, values);
  }

  removeLast(count = 1): void {
    this.remove(-count, count);
  }

  removeFirst(count = 1): void {
    this.remove(0, count);
  }

  remove(index: number, count: number = 1): void {
    this.splice(index, count);
  }

  insert(index: number, ...values: Array<UnreactiveNested<T>>): void {
    this.splice(index, 0, values);
  }

  replace(index: number, ...values: Array<UnreactiveNested<T>>): void {
    this.splice(index, values.length, values);
  }

  push(element: UnreactiveNested<T>): void {
    this.addLast(element);
  }

  unshift(element: UnreactiveNested<T>): void {
    this.addFirst(element);
  }

  pop(): UnreactiveNested<T> | undefined {
    return this.kick(this.value.length - 1);
  }

  shift(): UnreactiveNested<T> | undefined {
    return this.kick(0);
  }

  concat(...otherArrays: Array<Array<UnreactiveNested<T>>>): void {
    this.doSplice(this.value.length, 0, otherArrays.flat());
    this.commit();
  }

  splice(index: number, removeCount = 0, insertValues?: Array<UnreactiveNested<T>>, cache?: ReactiveCache): void {
    index = index < 0 ? Math.max(this.value.length + index, 0) : Math.min(index, this.value.length);
    removeCount = Math.min(removeCount, this.value.length - index);

    const toInsert: Array<any> = insertValues ?? [];
    const toReplace = toInsert.splice(0, removeCount);
    removeCount -= toReplace.length;

    toReplace.forEach(v => this.setComponent(index++, v, cache));

    this.doSplice(index, removeCount, toInsert, cache);

    this.commit();
  }

  private kick(i: number): UnreactiveNested<T> | undefined {
    const result = Reactive.unwrapNested(this.value[i]);
    this.remove(i);
    return result;
  }

  private truncate(length: number): void {
    this.doSplice(length, this.value.length - length);
  }

  private doSplice(index: number, removeCount: number, insertValues: Array<any> = [], cache?: ReactiveCache): void {
    if (removeCount > 0 || insertValues.length > 0) {
      this.value.splice(index, removeCount, ...insertValues.map(v => Reactive.nest(v, cache)));
      this.dirty = true;
    }
  }

  clone(): ReactiveArray<T> {
    return new ReactiveArray(this.value);
  }
}

/**
 * Produces a new reactive value based on other reactive values using a given {@link Derivation} function.
 * The function is called with a {@link SubscriptionTracker} that should be used to track the reactive values you depend on,
 * which ensures that it gets reevaluated whenever one of those dependencies change.
 * If you pass the tracker to {@link Reactive#get} this is done for you, so this is usually the most convenient way to go.
 * Note that the function is only evaluated when needed (on the first unwrap since its creation or since a dependency changed), effectively caching the result.
 */
export class ReactiveDerivation<T> extends Reactive<T> implements Subscriber, SubscriptionTracker, Resource {
  private valid = false;
  private value?: T;
  private subscriptions = new Set<Publisher>();

  /**
   * @see ReactiveDerivation
   */
  constructor(
    private derivation: Derivation<T>,
  ) {
    super();
  }

  unwrap(): T {
    if (this.valid) return this.value!;
    const oldSubscriptions = [...this.subscriptions];
    this.subscriptions.clear();
    this.value = this.derivation(this);
    oldSubscriptions.forEach(s => this.subscriptions.has(s) || s.unsubscribe(this));
    this.valid = true;
    return this.value;
  }

  update(): void {
    this.valid = false;
    this.updateSubscribers();
  }

  subscribeTo(publisher: Publisher): void {
    publisher.subscribe(this);
    this.subscriptions.add(publisher);
  }

  unsubscribe(subscriber: Subscriber) {
    super.unsubscribe(subscriber);
    if (!this.hasSubscribers()) this.free();
  }

  free(): void {
    this.valid = false;
    this.value = undefined;
    this.subscriptions.forEach(s => s.unsubscribe(this));
    this.subscriptions.clear();
  }
}
