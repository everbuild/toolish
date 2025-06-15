import { Unreactive } from './base';
import { PatchSource, ReactiveValue } from './value';

export type ComponentWrapper<T> = <K extends keyof T>(value: Unreactive<T[K]>) => T[K];
export type ComponentPatchConverter<T> = <K extends keyof T>(value: PatchSource<T[K]>, key: K) => Unreactive<T[K]>;

export abstract class ReactiveContainer<T extends object> extends ReactiveValue<T> {
  protected dirty = false;

  constructor(
    value: T,
    protected wrapComponent: ComponentWrapper<T>,
    protected convertPatchSource: ComponentPatchConverter<T>,
  ) {
    super(value);
  }

  protected patchComponent<K extends keyof T>(key: K, value: PatchSource<T[K]>): void {
    const existing = this.value[key];
    if (existing instanceof ReactiveValue) {
      existing.patch(value);
    } else {
      this.value[key] = this.wrapComponent(this.convertPatchSource<K>(value, key));
      this.dirty = true;
    }
  }

  protected setComponent<K extends keyof T>(key: K, value: Unreactive<T[K]>): void {
    const existing = this.value[key];
    if (existing instanceof ReactiveValue) {
      existing.set(value);
    } else {
      this.value[key] = this.wrapComponent(value);
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