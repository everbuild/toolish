import { areEqual } from '../general';
import { isObject } from '../object';
import type { Reactive } from './base';
import { NO_TRACK } from './internal';

export interface ReactiveCache {
  set(raw: any, reactive: Reactive<any>): void;

  get(raw: any): Reactive<any> | undefined;
}

/**
 * {@link ReactiveCache} implementation that only caches objects using a {@link !WeakMap}.
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
      if (areEqual(raw, reactive.unnest(NO_TRACK))) return reactive;
      this.map.delete(raw);
    }
  }

  private supports(raw: any): raw is WeakKey {
    return isObject(raw);
  }
}

