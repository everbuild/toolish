import { Unreactive } from './base';
import { ReactiveValue } from './value';

export type ComponentFactory<T> = <K extends keyof T>(value: Unreactive<T[K]>, key: K) => T[K];

export abstract class ReactiveContainer<T extends object> extends ReactiveValue<T> {
  protected dirty = false;

  constructor(
    value: T,
    protected createComponent: ComponentFactory<T>,
  ) {
    super(value);
  }

  protected patchComponent<K extends keyof T>(key: K, value: Unreactive<T[K]>): void {
    const existing = this.value[key];
    if (existing instanceof ReactiveValue) {
      existing.patch(value);
    } else {
      this.value[key] = this.createComponent<K>(value, key);
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