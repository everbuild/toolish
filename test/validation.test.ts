import { delay } from '../src/timing';
import { email, max, maxLength, min, minLength, required, validate } from '../src/validation';

test('validate', async () => {
  expect(await validate('hi', { required })).toEqual([]);
  expect(await validate(1337, { required })).toEqual([]);
  expect(await validate(false, { required })).toEqual([]);
  expect(await validate({}, { required })).toEqual([]);
  expect(await validate(' ', { required })).toEqual([{ key: 'required' }]);
  expect(await validate(undefined, { required })).toEqual([{ key: 'required' }]);
  expect(await validate(null, { required })).toEqual([{ key: 'required' }]);
  expect(await validate([], { required })).toEqual([{ key: 'required' }]);
  expect(await validate(null, {})).toEqual([]);
  expect(await validate('', { email })).toEqual([]);
  expect(await validate([], { required, email })).toEqual([{ key: 'required' }]);
  expect(await validate('', { async: () => delay(10).then(() => true) })).toEqual([]);
  expect(await validate('', { async: () => delay(10).then(() => false) })).toEqual([{ key: 'async' }]);
});

test('required', () => {
  expect(required('ok')).toBe(true);
  expect(required('')).toBe(false);
  expect(required(' ')).toBe(false);
  expect(required([1])).toBe(true);
  expect(required([])).toBe(false);
  expect(required(null)).toBe(false);
  expect(required(undefined)).toBe(false);
  expect(required(1337)).toBe(true);
  expect(required({})).toBe(true);
});

test('min', () => {
  expect(min(0)(10)).toBe(true);
  expect(min(10)(5)).toEqual({ limit: 10 });
  expect(min(10)('5')).toEqual({ limit: 10 });
  expect(min(0)('10')).toBe(true);
  expect(min(0)('tenish')).toBe(true);
  expect(min(0)(null)).toBe(true);
});

test('max', () => {
  expect(max(10)(5)).toBe(true);
  expect(max(0)(10)).toEqual({ limit: 0 });
  expect(max(0)('10')).toEqual({ limit: 0 });
  expect(max(10)('5')).toBe(true);
  expect(max(0)('tenish')).toBe(true);
  expect(max(0)(null)).toBe(true);
});

test('minLength', () => {
  expect(minLength(0)([])).toBe(true);
  expect(minLength(0)([1,2])).toBe(true);
  expect(minLength(2)([1,2])).toBe(true);
  expect(minLength(2)([1])).toEqual({ length: 2 });
  expect(minLength(0)('')).toBe(true);
  expect(minLength(0)('12')).toBe(true);
  expect(minLength(2)('12')).toBe(true);
  expect(minLength(2)('1')).toEqual({ length: 2 });
  expect(minLength(2)(1)).toEqual(true);
});

test('maxLength', () => {
  expect(maxLength(0)([])).toBe(true);
  expect(maxLength(10)([1,2])).toBe(true);
  expect(maxLength(2)([1,2])).toBe(true);
  expect(maxLength(0)([1])).toEqual({ length: 0 });
  expect(maxLength(0)('')).toBe(true);
  expect(maxLength(10)('12')).toBe(true);
  expect(maxLength(2)('12')).toBe(true);
  expect(maxLength(0)('1')).toEqual({ length: 0 });
  expect(maxLength(-2)(10)).toEqual(true);
});

test('email', async () => {
  expect(email('')).toEqual(true);
  expect(email(1337)).toEqual(true);
  expect(email({})).toEqual(true);
  expect(email('john@test.com')).toEqual(true);
  expect(email('john')).toEqual(false);
  expect(email('john@')).toEqual(false);
  expect(email('john@test')).toEqual(false);
  expect(email('john@test.com.')).toEqual(false);
  expect(email('@test.com.')).toEqual(false);
  expect(email('.@test.com.')).toEqual(false);
  expect(email('.j@test.com.')).toEqual(false);
});
