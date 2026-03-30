/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'worker-no-react',
      severity: 'error',
      comment:
        'Simspace/heavy worker dependency graphs must not reach react (use worker-safe modules only).',
      from: { path: '^zss/' },
      to: { path: '^node_modules/react(/|$)' },
    },
    {
      name: 'worker-no-react-dom',
      severity: 'error',
      comment:
        'Simspace/heavy worker dependency graphs must not reach react-dom.',
      from: { path: '^zss/' },
      to: { path: '^node_modules/react-dom(/|$)' },
    },
    {
      name: 'worker-no-three',
      severity: 'error',
      comment:
        'Simspace/heavy worker dependency graphs must not reach three.js.',
      from: { path: '^zss/' },
      to: { path: '^node_modules/three(/|$)' },
    },
    {
      name: 'worker-no-react-three',
      severity: 'error',
      comment:
        'Simspace/heavy worker dependency graphs must not reach @react-three/*.',
      from: { path: '^zss/' },
      to: { path: '^node_modules/@react-three/' },
    },
  ],
  options: {
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    doNotFollow: {
      path: 'node_modules',
    },
  },
}
