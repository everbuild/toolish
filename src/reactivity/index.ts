/**
 * Simple, explicit, push-based reactivity system.
 *
 * Principal functionality:
 *
 * * `Reactive.of(...)`: {@link Reactive.of:VALUE | make a value reactive}.
 * * `Reactive.nest(...)`: make an {@link Reactive.nest:OBJECT | object} or {@link Reactive.nest:ARRAY | array} and their direct properties/elements reactive.
 * * `Reactive.derive(tracker => reactive1.get(tracker) + reactive2.get(tracker))`: {@link Reactive.derive:STATIC | Derive a reactive value} from other reactive values.
 * * `reactive.get(tracker)`: {@link Reactive.get | Get the underlying value} and track this dependency (important with derivatives ⤴️).
 * * `reactive.unwrap()`: {@link Reactive.unwrap:INSTANCE | Get the underlying value} without dependency tracking.
 * * `reactive.consume(value => ...)`: {@link Reactive.consume:INSTANCE | register a consumer function} that gets called with the underlying value immediately and after every update.
 * * `reactive.set(...)`: {@link ReactiveValue.set | Update the underlying value}.
 * * `reactive.patch(...)`: Where possible, only {@link ReactiveValue.patch | update the differences} with the given reference value.
 *
 * {@link Reactive} is the base abstraction of a reactive entity.
 * Its subclass {@link ReactiveValue} wraps an actual value, while {@link ReactiveDerivative} represents a derived value.
 * {@link ReactiveArray} is a specialization offering convenience methods to work with arrays and {@link ReactiveObject} is the same for objects.
 *
 * [tests](https://github.com/everbuild/toolish/blob/main/test/reactivity.test.ts | The tests contain more usage examples).
 *
 * @module
 */

export * from './publisher';
export * from './cache';
export * from './consumer';
export * from './base';
export * from './value';
export * from './derivative';
export * from './container';
export * from './object';
export * from './array';
export { NO_TRACK } from './internal';
export { NO_CACHE } from './internal';
