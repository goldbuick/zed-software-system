import type { Config } from 'jest'

/** Per-test and hook ceiling so suites cannot hang without failing. */
const TEST_TIMEOUT_MS = 120_000

const config: Config = {
  rootDir: '..',
  roots: ['<rootDir>/ops/tests'],
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testTimeout: TEST_TIMEOUT_MS,
  /** CI safety net when a worker still has stray handles after suites finish. */
  forceExit: process.env.CI === 'true',
  setupFilesAfterEnv: ['<rootDir>/zss/testing/jesttimeoutsetup.ts'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^zss/perf/ui$': '<rootDir>/ops/tests/mocks/perfui.ts',
    '^zss/(.*)$': '<rootDir>/zss/$1',
    '^uint8-util$': '<rootDir>/ops/tests/mocks/uint8-util.ts',
    '^@chevrotain/utils$':
      '<rootDir>/node_modules/@chevrotain/utils/lib/src/api.js',
    '^@chevrotain/gast$':
      '<rootDir>/node_modules/@chevrotain/gast/lib/src/api.js',
    '^@chevrotain/regexp-to-ast$':
      '<rootDir>/node_modules/@chevrotain/regexp-to-ast/lib/src/api.js',
    '^@chevrotain/cst-dts-gen$':
      '<rootDir>/node_modules/@chevrotain/cst-dts-gen/lib/src/api.js',
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
    'node_modules/(?!(nanoid|nanoid-dictionary|human-id|alea|ts-extras|fast-json-patch|react-fast-compare|uqr|maath|@react-three|three|mime|uint8-util|@tonejs/midi|midi-file|chevrotain|lodash-es|@chevrotain|marked|json-joy|@jsonjoy.com)/)',
  ],
  globalTeardown: '<rootDir>/zss/testing/jestglobalteardown.cjs',
  testPathIgnorePatterns: [
    '<rootDir>/ops/e2e/',
    '<rootDir>/ops/tests/unit/memory/wasm/__tests__/wasmparity.test.ts',
    '<rootDir>/ops/tests/unit/memory/wasm/__tests__/regenfixtures.test.ts',
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
  coverageDirectory: '<rootDir>/ops/coverage',
  collectCoverageFrom: ['zss/**/*.{ts,tsx}'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/ops/tests/mocks/',
    '/__tests__/',
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    './zss/device/vm/gadgetsynctick.ts': { lines: 70, functions: 70 },
    './zss/device/vm/handlers/scroll.ts': { lines: 60 },
    './zss/device/vm/handlers/ticktock.ts': { lines: 50 },
    './zss/device/boardrunner/handlers/linkdead.ts': { lines: 70 },
  },
}

export default config
