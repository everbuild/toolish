import { Reactive, Unreactive } from './base';
import { PatchSource, ReactiveValue } from './value';

export type ComponentFactory<T> = <K extends keyof T>(value: Unreactive<T[K]>, key: K) => T[K];

export abstract class ReactiveContainer<T extends object> extends ReactiveValue<T> {
  protected dirty = false;

  constructor(
    value: T,
    protected createComponent: ComponentFactory<T>,
  ) {
    super(value);
  }

  protected patchComponent<K extends keyof T>(key: K, value: PatchSource<T[K]>): void {
    const existing = this.value[key];
    if (existing instanceof ReactiveValue) {
      existing.patch(value);
    } else {
      this.value[key] = this.createComponent<K>(Reactive.unwrap(value, Reactive.NO_TRACK) as any, key);
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