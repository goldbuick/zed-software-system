// eslint-disable-next-line @typescript-eslint/no-var-requires
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

console.info('eslint ORG !!!!', { prefixes, srcFolders })

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  settings: {
    react: {
      version: 'detect', // Tells eslint-plugin-react to automatically detect the version of React to use
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      alias: {
        map: prefixes.map((item) => [`/${item}`, `./${item}`]),
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    },
  },
  extends: [
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    'plugin:react/recommended', // Uses the recommended rules from @eslint-plugin-react
    'plugin:import/errors', // Import ordering
    'plugin:import/warnings', // Import ordering
    'plugin:import/typescript', // Import ordering
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': [
      'error',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],
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
