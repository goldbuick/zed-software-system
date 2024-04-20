const fs = require('fs')

const prefixes = ['zss']

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
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
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
      alias: {
        map: [
          ...prefixes.map((item) => [`/${item}`, `./${item}`]),
          ['chevrotain', '.'],
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    },
  },
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    "@typescript-eslint/consistent-type-definitions": [
      'error', 'type'
    ],
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
    'import/no-unresolved': 'off',
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
}
