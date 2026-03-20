import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^zss/(.*)$': '<rootDir>/zss/$1',
    '^uint8-util$': '<rootDir>/zss/__mocks__/uint8-util.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'bundler',
        },
      },
    ],
    '^.+\\.m?js$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|nanoid-dictionary|human-id|alea|ts-extras|fast-json-patch|react-fast-compare|uqr|maath|@react-three|three|uint8-util|@tonejs/midi|midi-file)/)',
  ],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/__tests__/**/*.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  collectCoverageFrom: ['zss/**/*.{ts,tsx}'],
  coveragePathIgnorePatterns: ['/node_modules/', '/__mocks__/', '/__tests__/'],
}

export default config
