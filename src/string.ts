/**
 * @file Utilities for working with strings
 */

export function toKebabCase(source: string): string {
  return source.trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/--+/g, '-')
    .toLowerCase();
}

export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function isNotBlank(value: string): boolean {
  return !isBlank(value);
}
