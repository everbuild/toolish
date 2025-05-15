import { MaybePromiseLike } from './async';
import { isNumeric } from './general';
import { isObject } from './object';
import { isBlank, isNotBlank } from './string';
import { isPresent, Transformation } from './types';

/**
 * Allows a {@link Validator} to return parameters that can be used when displaying error messages.
 */
export type ValidationParameters = Record<string, any>;

/**
 * See {@link Validator}
 */
export type ValidationResult = boolean | ValidationParameters;

/**
 * Describes a function that checks whether a given value is valid.
 *
 * Should return true if valid, false or {@link ValidationParameters} otherwise.
 * The result may also be returned as a promise if async logic is required (e.g. to make a rest call that checks whether a username is available).
 * Running expensive operations at a high frequency is probably not a good idea though.
 *
 * IMPORTANT: validators should only check one thing and be tolerant of issues outside their scope.
 * For example, consider validating an e-mail field with the rule `{ email }`.
 * You don't want to show an error when the field is not filled in.
 * Even if the field is mandatory, you want to show {@link required | a different error for that}.
 * For this reason, the {@link email} validator for example also considers all non-string and empty values as valid.
 */
export type Validator = Transformation<unknown, MaybePromiseLike<ValidationResult>>;

export type ValidationRules = Record<string, Validator>;

export interface ValidationError {
  key: string;
  parameters?: ValidationParameters;
}

/**
 * Main validation function that checks whether a given value is valid according to the given rules.
 * Returns an array of validation errors, which is empty if the value is valid.
 */
export async function validate(value: unknown, rules: ValidationRules): Promise<Array<ValidationError>> {
  const errors: Array<ValidationError> = [];
  const promises = Object.entries(rules).map(async ([key, validator]) => {
    const result = await validator(value);
    if (!result) {
      errors.push({ key });
    } else if (isObject(result)) {
      errors.push({ key, parameters: result });
    }
  });
  await Promise.all(promises);
  return errors;
}

/**
 * General validator that always returns true.
 * Useful for overriding:
 * `{ ...commonValidators, min: dontCare }`
 * or in ternary expressions:
 * `{ required: receiveMails ? required : dontCare }`
 */
export function dontCare(): boolean {
  return true;
}

/**
 * General validator to make a field required.
 * Strings should not be blank, arrays should not be empty, anything else should not be nullish.
 */
export function required(value: unknown): boolean {
  if (typeof value === 'string') {
    return isNotBlank(value);
  } else if (Array.isArray(value)) {
    return value.length > 0;
  } else {
    return isPresent(value);
  }
}

/**
 * Creates a validator that checks whether a numeric value is not less than the given limit.
 */
export function min(limit: number): Validator {
  return value => {
    if (isNumeric(value) && value < limit) return { limit };
    return true;
  };
}

/**
 * Creates a validator that checks whether a numeric value is not greater than the given limit.
 */
export function max(limit: number): Validator {
  return value => {
    if (isNumeric(value) && value > limit) return { limit };
    return true;
  };
}

/**
 * Creates a validator that checks whether a string or array has at least the given length.
 */
export function minLength(length: number): Validator {
  return value => {
    if ((typeof value === 'string' || Array.isArray(value)) && value.length < length) return { length };
    return true;
  };
}

/**
 * Creates a validator that checks whether a string or array has at most the given length.
 */
export function maxLength(length: number): Validator {
  return value => {
    if ((typeof value === 'string' || Array.isArray(value)) && value.length > length) return { length };
    return true;
  };
}

const EMAIL_EXPRESSION = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * General robust and simple validator to check that a non-blank string contains a reasonably acceptable e-mail address.
 */
export function email(value: unknown): boolean {
  return typeof value !== 'string' || isBlank(value) || EMAIL_EXPRESSION.test(value);
}
