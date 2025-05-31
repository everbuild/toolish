import { sanitizeRangeEnd, sanitizeRangeLength, sanitizeRangeStart, mirrorIndex } from '../array';
import { MaybeReactive, Reactive, Unreactive } from './base';
import { ComponentFactory, ReactiveContainer } from './container';
import { ReactiveDerivative } from './derivative';
import { ReactiveFactory } from './internal';
import type { PatchSource } from './value';

export type ElementFactory<T> = (value: Unreactive<T>, key: number) => T;

/**
 * Wraps an array, supports {@link patch} and offers convenience methods to reactively mutate the array.
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
   * Alias for {@link select:single}
   */
  getElement(index: number): ReactiveDerivative<T> {
    return this.select(index);
  }

  /**
   * Updates the element at the given index.
   * You can use a negative index to {@link mirrorIndex | count back from the end}.
   */
  setElement(index: number, value: PatchSource<T>): this {
    this.patchComponent(mirrorIndex(this.value.length, index), value);
    this.commit();
    return this;
  }

  /**
   * Append elements to the end of the array.
   * This is comparable to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push | native push } but with arguably clearer naming.
   */
  addLast(...values: Array<Unreactive<T>>): void {
    this.splice(this.value.length, 0, values);
  }

  /**
   * Insert elements to the beginning of the array.
   * This is comparable to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/unshift | native unshift } but with arguably clearer naming.
   */
  addFirst(...values: Array<Unreactive<T>>): void {
    this.splice(0, 0, values);
  }

  /**
   * Remove elements from the end of the array.
   * This is comparable to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/pop | native pop } but with arguably clearer naming.
   */
  removeLast(count = 1): void {
    this.remove(-count, count);
  }

  /**
   * Remove elements from the beginning of the array.
   * This is comparable to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift | native shift } but with arguably clearer naming.
   */
  removeFirst(count = 1): void {
    this.remove(0, count);
  }

  /**
   * Remove elements at the given index within the array.
   */
  remove(index: number, count: number = 1): void {
    this.splice(index, count);
  }

  /**
   * Insert elements at the given index within the array.
   */
  insert(index: number, ...values: Array<Unreactive<T>>): void {
    this.splice(index, 0, values);
  }

  /**
   * Replace elements at the given index within the array.
   */
  replace(index: number, ...values: Array<Unreactive<T>>): void {
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
    this.remove(i);
    return result;
  }

  private truncate(length: number): void {
    this.doSplice(length, this.value.length - length);
  }

  /**
   * Reactive {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice | splice }.
   */
  splice(index: number, removeCount = 0, insertValues?: Array<Unreactive<T>>): this {
    const limit = this.value.length;
    index = sanitizeRangeStart(limit, index);
    removeCount = sanitizeRangeLength(limit, removeCount, index);

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
   * Reactive {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill | fill }.
   */
  fill(value: PatchSource<T>, start?: number, end?: number): this {
    const limit = this.value.length;
    start = sanitizeRangeStart(limit, start);
    end = sanitizeRangeEnd(limit, end, start);
    for (let i = start; i < end; i++) {
      this.patchComponent(i, value);
    }
    this.commit();
    return this;
  }

  /**
   * Reactive {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/copyWithin | copyWithin }.
   */
  copyWithin(target: number, start: number, end?: number): this {
    this.value.copyWithin(target, start, end);
    this.updateSubscribers();
    return this;
  }

  clone(): ReactiveArray<T> {
    return new ReactiveArray(this.value, this.createElement);
  }
}

ReactiveFactory.array = (v, cc) => new ReactiveArray(v, cc);

