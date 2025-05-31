import { ignore } from '../general';
import type { ElementFactory, ReactiveArray } from './array';
import type { ReactiveCache } from './cache';
import type { ComponentFactory } from './container';
import type { Derivation, ReactiveDerivative } from './derivative';
import type {  ReactiveObject } from './object';
import type { SubscriptionTracker } from './publisher';
import type { ReactiveValue } from './value';

export const NO_TRACK: SubscriptionTracker = { subscribeTo: ignore };

export const NO_CACHE: ReactiveCache = { get: ignore, set: ignore };

export const ReactiveFactory = {
  value<T>(value: T): ReactiveValue<T> {
    throw new Error('value not implemented');
  },

  array<T>(value: Array<T>, createElement: ElementFactory<T>): ReactiveArray<T> {
    throw new Error('array not implemented');
  },

  object<T extends object>(value: T, createProperty: ComponentFactory<T>): ReactiveObject<T> {
    throw new Error('object not implemented');
  },

  derivative<T>(derivation: Derivation<T>): ReactiveDerivative<T> {
    throw new Error('derivative not implemented');
  },
};
