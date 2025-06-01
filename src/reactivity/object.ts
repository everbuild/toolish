import { ComponentFactory, ReactiveContainer } from './container';
import { ReactiveDerivative } from './derivative';
import { ReactiveFactory } from './internal';
import type { PatchSource,ReactiveValue } from './value';

export interface PropertyRemover {
  (value: Record<keyof any, any>, key: keyof any): void;
}

/**
 * Wraps an object, supports {@link patch} and offers convenience methods to reactively mutate the object.
 */
export class ReactiveObject<T extends object> extends ReactiveContainer<T> {
  constructor(
    value: T,
    createProperty: ComponentFactory<T>,
  ) {
    super(value, createProperty);
  }

  /**
   * Defines how properties are removed. By default, `undefined` is assigned.
   */
  static REMOVAL_STRATEGY: PropertyRemover = (o, k) => o[k] = undefined;

  /**
   * Patches, adds or removes properties as needed to match the given source object.
   * @see {@link REMOVAL_STRATEGY} to tweak how properties are removed.
   * @see {@link ReactiveValue.patch} for more details.
   */
  patch(source: PatchSource<T>): void {
    const allKeys = Object.keys({ ...this.value, ...source }) as Array<keyof T>;
    allKeys.forEach(k => k in source ? this.patchComponent(k, (source as any)[k]) : this.doRemoveProperty(k));
    this.commit();
  }

  /**
   * Alias for {@link Reactive.select:ONE}
   */
  getProperty<K extends keyof T>(key: K): ReactiveDerivative<T[K]> {
    return this.select(key);
  }

  setProperty<K extends keyof T>(key: K, value: PatchSource<T[K]>): this {
    this.patchComponent(key, value);
    this.commit();
    return this;
  }

  removeProperty(key: keyof T): void {
    this.doRemoveProperty(key);
    this.commit();
  }

  private doRemoveProperty(key: keyof T): void {
    if (key in this.value) {
      ReactiveObject.REMOVAL_STRATEGY(this.value, key);
      this.dirty = true;
    }
  }

  clone(): ReactiveObject<T> {
    return new ReactiveObject(this.value, this.createComponent);
  }
}

ReactiveFactory.object = (o, pf) => new ReactiveObject(o, pf);