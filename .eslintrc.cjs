const fs = require('fs')

const prefixes = ['zss', 'cafe']

const alias = { chevrotain: '.' }
prefixes.forEach((item) => {
  alias[`/${item}`] = `./${item}`
})

const srcFolders = prefixes
  .map((folder) =>
    fs
      .readdirSync(`./${folder}`, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => `/${folder}/${dirent.name}`),
  )
  .concat(prefixes.map((folder) => `/${folder}`))
  .flat()

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:import/errors', // Import ordering
    'plugin:import/warnings', // Import ordering
    'plugin:import/typescript', // Import ordering
    'plugin:react/jsx-runtime',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@react-three/recommended',
    'plugin:prettier/recommended',
    // Enables eslint-plugin-prettier and eslint-config-prettier.
    // This will display prettier errors as ESLint errors.
    // Make sure this is always the last configuration in the extends array.
    'prettier',
  ],
  parserOptions: {
    project: './tsconfig.lint.json',
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
    'import/resolver': {
      'eslint-import-resolver-custom-alias': {
        alias,
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    },
  },
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'curly': ['error', 'all'],
    '@typescript-eslint/prefer-for-of': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-redundant-type-constituents': 'off',
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    'no-console': [
      'error',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/react-in-jsx-scope': 'off',
    'react/self-closing-comp': [
      'error',
      {
        component: true,
        html: true,
      },
    ],
    'react/prefer-stateless-function': [2],
    'react/function-component-definition': [
      2,
      { namedComponents: 'function-declaration' },
    ],
    'react/no-unknown-property': [
      'error',
      {
        ignore: [
          // Object3D / group, mesh, etc.
          'position',
          'rotation',
          'scale',
          'quaternion',
          'position-x',
          'position-y',
          'position-z',
          'rotation-x',
          'rotation-y',
          'rotation-z',
          'scale-x',
          'scale-y',
          'scale-z',
          'quaternion-x',
          'quaternion-y',
          'quaternion-z',
          'quaternion-w',
          // R3F / Three.js common
          'args',
          'attach',
          'dispose',
          'onUpdate',
          'object',
          'castShadow',
          'receiveShadow',
          'userData',
          'geometry',
          'material',
          'metalness',
          'roughness',
          'side',
          'flatShading',
          'shininess',
          'specular',
          // Camera
          'near',
          'far',
          'aspect',
          'left',
          'right',
          'top',
          'bottom',
          // Material / Object3D / texture
          'usage',
          'transparent',
          'visible',
          'map',
          'frustumCulled',
          'renderOrder',
          'depthWrite',
          'depthTest',
          'polygonOffset',
          'polygonOffsetFactor',
          'polygonOffsetUnits',
          'wireframe',
          'raycast',
        ],
      },
    ],
    'import/no-unresolved': 'off',
    'sort-imports': [
      'error',
      {
        ignoreDeclarationSort: true,
      },
    ],
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        pathGroups: srcFolders.map((prefix) => ({
          group: 'internal',
          pattern: `${prefix}/**`,
          position: 'before',
        })),
      },
    ],
  },
  overrides: [
    {
      files: ['zss/simspace.ts', 'zss/heavyspace.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'react',
                message:
                  'Do not import react in worker entry files; keep simspace/heavyspace worker-safe.',
              },
              {
                name: 'react-dom',
                message:
                  'Do not import react-dom in worker entry files; keep simspace/heavyspace worker-safe.',
              },
              {
                name: 'react-dom/client',
                message:
                  'Do not import react-dom/client in worker entry files; keep simspace/heavyspace worker-safe.',
              },
              {
                name: 'react/jsx-runtime',
                message:
                  'Do not import react/jsx-runtime in worker entry files; keep simspace/heavyspace worker-safe.',
              },
              {
                name: 'three',
                message:
                  'Do not import three in worker entry files; keep simspace/heavyspace worker-safe.',
              },
            ],
            patterns: [
              {
                group: ['@react-three/*'],
                message:
                  'Do not import @react-three/* in worker entry files; keep simspace/heavyspace worker-safe.',
              },
            ],
          },
        ],
      },
    },
  ],
}
