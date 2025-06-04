import { mirrorIndex, normalizeRangeEnd, normalizeRangeLength, normalizeRangeStart } from '../array';
import { equals } from '../general';
import { DualPredicate, Predicate } from '../types';
import { Reactive, Unreactive } from './base';
import { ComponentFactory, ReactiveContainer } from './container';
import { ReactiveDerivative } from './derivative';
import { ReactiveFactory } from './internal';
import type { PatchSource, ReactiveValue } from './value';

export type ElementFactory<T> = (value: Unreactive<T>, key: number) => T;

/**
 * Wraps an array, supports {@link patch} and offers convenience methods to reactively mutate the array.
 *
 * @example
 * ```
 * // ReactiveArray supports most standard array mutation methods
 * // notice some signatures are slightly different though
 * reactiveArray.splice(1, 3, [3, 7]);
 *
 * // aliases are provided in an attempt to clarify some confusing names; e.g. these are equivalent:
 * reactiveArray.addFirst(7);
 * reactiveArray.unshift(7);
 *
 * // additional utility methods similar to those provided by the array module are also available
 * reactiveArray.removeAll(1337);
 *
 * // Non-mutating standard array methods are not replicated
 * // they can easily be used through derive:
 * reactiveArray.derive(a => a.filter(...));
 *
 * // or if no reactivity is needed, just unwrap:
 * reactiveArray.unwrap().filter(...);
 * ```
 */
export class ReactiveArray<T> extends ReactiveContainer<Array<T>> {
  constructor(
    value: Array<T>,
    private createElement: ElementFactory<T>,
  ) {
    super(value, createElement as ComponentFactory<Array<T>>);
  }

  /**
   * Patches, adds or removes elements as needed to match the given source array.
   * @see {@link ReactiveValue.patch} for more details.
   */
  patch(source: PatchSource<Array<T>>): void {
    source.forEach((v, i) => this.patchComponent(i, v));
    this.truncate(source.length);
    this.commit();
  }

  /**
   * Alias for {@link Reactive.select:ONE}
   */
  getAt(index: number): ReactiveDerivative<T> {
    return this.select(index);
  }

  /**
   * Updates the element at the given index.
   * You can use a negative index to {@link array.mirrorIndex | count back from the end}.
   */
  setAt(index: number, value: PatchSource<T>): this {
    this.patchComponent(mirrorIndex(this.value.length, index), value);
    this.commit();
    return this;
  }

  /**
   * Append elements to the end of the array.
   * This is comparable to {@link !Array.push} but with arguably clearer naming.
   */
  addLast(...values: Array<Unreactive<T>>): void {
    this.splice(this.value.length, 0, values);
  }

  /**
   * Insert elements to the beginning of the array.
   * This is comparable to {@link !Array.unshift} but with arguably clearer naming.
   */
  addFirst(...values: Array<Unreactive<T>>): void {
    this.splice(0, 0, values);
  }

  /**
   * Remove elements from the end of the array.
   * This is comparable to {@link !Array.pop} but with arguably clearer naming.
   */
  removeLast(count = 1): void {
    this.removeAt(-count, count);
  }

  /**
   * Remove elements from the beginning of the array.
   * This is comparable to {@link !Array.shift} but with arguably clearer naming.
   */
  removeFirst(count = 1): void {
    this.removeAt(0, count);
  }

  /**
   * Remove elements at the given index within the array.
   */
  removeAt(index: number, count: number = 1): void {
    this.splice(index, count);
  }

  /**
   * Insert elements at the given index within the array.
   */
  insertAt(index: number, ...values: Array<Unreactive<T>>): void {
    this.splice(index, 0, values);
  }

  /**
   * Replace elements at the given index within the array.
   */
  swapAt(index: number, ...values: Array<Unreactive<T>>): void {
    this.splice(index, values.length, values);
  }

  /**
   * Alias for {@link addLast} that complies with the native API.
   */
  push(...elements: Array<Unreactive<T>>): void {
    this.addLast(...elements);
  }

  /**
   * Alias for {@link addFirst} that complies with the native API.
   */
  unshift(...elements: Array<Unreactive<T>>): void {
    this.addFirst(...elements);
  }

  /**
   * Alias for {@link removeLast} that complies with the native API.
   */
  pop(): Unreactive<T> | undefined {
    return this.kick(this.value.length - 1);
  }

  /**
   * Alias for {@link removeFirst} that complies with the native API.
   */
  shift(): Unreactive<T> | undefined {
    return this.kick(0);
  }

  private kick(i: number): Unreactive<T> | undefined {
    const result = Reactive.unwrap(this.value[i], Reactive.NO_TRACK);
    this.removeAt(i);
    return result;
  }

  private truncate(length: number): void {
    this.doSplice(length, this.value.length - length);
  }

  /**
   * Reactive {@link !Array.splice}.
   */
  splice(index: number, removeCount = 0, insertValues?: Array<Unreactive<T>>): this {
    const limit = this.value.length;
    index = normalizeRangeStart(limit, index);
    removeCount = normalizeRangeLength(limit, removeCount, index);

    const toInsert: Array<any> = insertValues ?? [];
    const toReplace = toInsert.splice(0, removeCount);
    removeCount -= toReplace.length;

    toReplace.forEach(v => this.patchComponent(index++, v));

    this.doSplice(index, removeCount, toInsert);

    this.commit();

    return this;
  }

  private doSplice(index: number, removeCount: number, insertValues: Array<any> = []): void {
    if (removeCount > 0 || insertValues.length > 0) {
      this.value.splice(index, removeCount, ...insertValues.map(((v, i) => this.createElement(v, i))));
      this.dirty = true;
    }
  }

  /**
   * Reactive {@link !Array.fill}.
   */
  fill(value: PatchSource<T>, start?: number, end?: number): this {
    const limit = this.value.length;
    start = normalizeRangeStart(limit, start);
    end = normalizeRangeEnd(limit, end, start);
    for (let i = start; i < end; i++) {
      this.patchComponent(i, value);
    }
    this.commit();
    return this;
  }

  /**
   * Reactive {@link !array.swapElement}
   */
  swap(value: Unreactive<T>, replacement: Unreactive<T>): T | undefined {
    return this.swapBy(replacement, equals(value));
  }

  /**
   * Reactive {@link !array.swapElementBy}
   */
  swapBy(replacement: Unreactive<T>, predicate: DualPredicate<Unreactive<T>>): T | undefined {
    const i = this.value.findIndex(v => predicate(Reactive.unwrap(v, Reactive.NO_TRACK), replacement));
    if (i >= 0) {
      const result = this.value[i];
      this.patchComponent(i, replacement as any);
      this.commit();
      return result;
    }
  }

  /**
   * Reactive {@link !array.swapAllElements}
   */
  swapAll(value: Unreactive<T>, replacement: Unreactive<T>): Array<T> {
    return this.swapAllBy(replacement, equals(value));
  }

  /**
   * Reactive {@link !array.swapAllElementsBy}
   */
  swapAllBy(replacement: Unreactive<T>, predicate: DualPredicate<Unreactive<T>>): Array<T> {
    return this.value.filter((v, i) => {
      const match = predicate(Reactive.unwrap(v, Reactive.NO_TRACK), replacement);
      if (match) this.patchComponent(i, replacement as any);
      return match;
    });
  }

  /**
   * Reactive {@link !array.swapOrAddElement}
   */
  swapOrAdd(value: Unreactive<T>, replacement: Unreactive<T>): T | undefined {
    return this.swapOrAddBy(replacement, equals(value));
  }

  /**
   * Reactive {@link !array.swapOrAddElementBy}
   */
  swapOrAddBy(replacement: Unreactive<T>, predicate: DualPredicate<Unreactive<T>>): T | undefined {
    const result = this.swapBy(replacement, predicate);
    if (result === undefined) this.addLast(replacement);
    return result;
  }

  /**
   * Reactive {@link !array.removeElement}
   */
  remove(value: Unreactive<T>): T | undefined {
    return this.removeBy(equals(value));
  }

  /**
   * Reactive {@link !array.removeElementBy}
   */
  removeBy(predicate: Predicate<Unreactive<T>>): T | undefined {
    const i = this.value.findIndex(v => predicate(Reactive.unwrap(v, Reactive.NO_TRACK)));
    if (i >= 0) {
      const result = this.value[i];
      this.splice(i, 1);
      return result;
    }
  }

  /**
   * Reactive {@link !array.removeAllElements}
   */
  removeAll(value: Unreactive<T>): Array<T> {
    return this.removeAllBy(equals(value));
  }

  /**
   * Reactive {@link !array.removeAllElementsBy}
   */
  removeAllBy(predicate: Predicate<Unreactive<T>>): Array<T> {
    return this.value.filter((v, i) => {
      const match = predicate(Reactive.unwrap(v, Reactive.NO_TRACK));
      if (match) this.splice(i, 1);
      return match;
    });
  }

  /**
   * Reactive {@link !array.toggleElement}
   */
  toggle(value: Unreactive<T>): T | undefined {
    return this.toggleBy(value, equals(value));
  }

  /**
   * Reactive {@link !array.toggleElementBy}
   */
  toggleBy(value: Unreactive<T>, predicate: DualPredicate<Unreactive<T>>): T | undefined {
    const result = this.removeBy(v => predicate(v, value));
    if (result === undefined) this.addLast(value);
    return result;
  }

  clone(): ReactiveArray<T> {
    return new ReactiveArray(this.value, this.createElement);
  }
}

ReactiveFactory.array = (v, cc) => new ReactiveArray(v, cc);

