import { toKebabCase } from '../src/string';

test('toKebabCase', () => {
  expect(toKebabCase('someTextValue')).toEqual('some-text-value');
  expect(toKebabCase('Some_TextValue')).toEqual('some-text-value');
  expect(toKebabCase('already-kebab-case')).toEqual('already-kebab-case');
  expect(toKebabCase('   weird___string 123!')).toEqual('weird-string-123');
});
