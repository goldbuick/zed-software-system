/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'worker-no-react',
      severity: 'error',
      comment:
        'Worker dependency graphs must not reach react (use worker-safe modules only).',
      from: { path: '^zss/' },
      to: { path: '^node_modules/react(/|$)' },
    },
    {
      name: 'worker-no-react-dom',
      severity: 'error',
      comment:
        'Worker dependency graphs must not reach react-dom.',
      from: { path: '^zss/' },
      to: { path: '^node_modules/react-dom(/|$)' },
    },
    {
      name: 'worker-no-three',
      severity: 'error',
      comment:
        'Worker dependency graphs must not reach three.js.',
      from: { path: '^zss/' },
      to: { path: '^node_modules/three(/|$)' },
    },
    {
      name: 'worker-no-react-three',
      severity: 'error',
      comment:
        'Worker dependency graphs must not reach @react-three/*.',
      from: { path: '^zss/' },
      to: { path: '^node_modules/@react-three/' },
    },
    {
      name: 'worker-no-register-device',
      severity: 'error',
      comment:
        'Workers must use registerplayer.ts for player id, not the full register device.',
      from: {
        path: '^zss/(simspace|boardrunnerspace|sttspace|ttsspace)\\.ts',
      },
      to: { path: '^zss/device/register\\.ts$' },
    },
    {
      name: 'main-no-fishaudio',
      severity: 'error',
      comment:
        'Main-thread TTS orchestration must not import fishaudio; Fish runs in ttsspace only.',
      from: { path: '^zss/feature/tts/client\\.ts$' },
      to: { path: '^zss/feature/tts/fishaudio\\.ts$' },
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
