import { isObject } from './object';

export interface GenericFunction<A extends Array<any>, R> {
  (...args: A): R;
}

export type Constructor<T, A extends Array<any> = Array<any>> = new (...args: A) => T;

export type Transformation<T, R> = GenericFunction<[T], R>;

export type Consumer<T> = Transformation<T, void>;

export type Producer<T> = GenericFunction<[], T>;

export type Predicate<T> = Transformation<T, boolean>;

export type DualPredicate<T1, T2 = T1> = GenericFunction<[T1, T2], boolean>;

export type Nullish = null | undefined;

export type MaybeNullish<T> = T | Nullish;

/**
 * Semantic type that indicates a value that is interpreted as true if it is truthy, false otherwise.
 */
export type Truthiness = any;

/**
 * Describes values that are considered as falsy in JS.
 * NOTE there's a few more possibilities (obviously) but these don't have types at the moment and should be rare
 * cf https://developer.mozilla.org/en-US/docs/Glossary/Falsy
 */
export type Falsy = Nullish | false | 0 | 0n | '';

export type MaybeFalsy<T> = T | Falsy;

export type EnumValue = string | number;

export type EnumType<T extends EnumValue> = Record<string, T>;

export function isNullish(value: unknown): value is Nullish {
  return value === null || value === undefined;
}

export function isPresent<T>(value: MaybeNullish<T>): value is T {
  return !isNullish(value);
}

export function ifPresent<T, R = void>(value: MaybeNullish<T>, action: Transformation<T, R>): R | undefined {
  if (isPresent(value)) return action(value);
}

export function expectPresent<T>(value: MaybeNullish<T>, message = 'value is nullish'): T {
  if (isNullish(value)) throw new Error(message);
  return value;
}

export function isFalsy(value: unknown): value is Falsy {
  return !value;
}

export function isTruthy<T>(value: MaybeFalsy<T>): value is T {
  return !isFalsy(value);
}

export function ifTruthy<T, R = void>(value: MaybeFalsy<T>, action: Transformation<T, R>): R | undefined {
  if (isTruthy(value)) return action(value);
}

export function expectTruthy<T>(value: MaybeFalsy<T>, message = 'value is falsy'): T {
  if (isFalsy(value)) throw new Error(message);
  return value;
}

export function getEnumKeys<T extends EnumType<any>>(type: T): Array<keyof T> {
  if (!isObject(type)) return [];
  return Object.keys(type).filter(key => isNaN(Number(key)));
}

export function getEnumValues<T extends EnumValue>(type: EnumType<T>): Array<T> {
  return getEnumKeys(type).map(key => type[key]);
}

export function isEnumValue<T extends EnumValue>(value: unknown, type: EnumType<T>): value is T {
  return getEnumValues(type).includes(value as T);
}

export function ifEnumValue<T extends EnumValue, R = void>(value: unknown, type: EnumType<T>, action: Transformation<T, R>): R | undefined {
  if (isEnumValue(value, type)) return action(value);
}

export function expectEnumValue<T extends EnumValue>(value: unknown, type: EnumType<T>, message = `invalid value for enum ${type}`): T {
  if (!isEnumValue(value, type)) throw new Error(message);
  return value;
}

export function isOneOf<T>(value: unknown, ...options: Array<T>): value is T {
  return options.includes(value as T);
}

export function ifOneOf<T, R = void>(value: unknown, options: Array<T>, action: Transformation<T, R>): R | undefined {
  if (isOneOf(value, ...options)) return action(value);
}

export function expectOneOf<T>(value: unknown, options: Array<T>, message = `value is none of ${options.join(', ')}`): T {
  if (!isOneOf(value, ...options)) throw new Error(message);
  return value;
}
