/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  roots: ['test', 'src'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testEnvironment: "node",
  preset: 'ts-jest/presets/default-esm',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    "^.+.tsx?$": ["ts-jest",{useESM: true}],
  },
};