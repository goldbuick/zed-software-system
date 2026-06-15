import { def, exec, shell, tasksonly } from '../helpers'
import { parityfull } from '../pipelines'
import type { TaskDef } from '../types'

export const DAISY_TASKS: TaskDef[] = [
  def('daisy:build', {
    description: 'Build Daisy WASM native synth',
    run: shell('sh zss/feature/synth/backend/daisy/native/build-daisy.sh'),
  }),
  def('daisy:bundle:processor', {
    description: 'Bundle daisy audio worklet processor',
    run: exec(['tsx', 'scripts/bundle-daisy-processor.ts']),
  }),
  def('daisy:lint', {
    description: 'clang-format check on daisy C++',
    run: shell('sh scripts/clang-format.sh check daisy'),
  }),
  def('daisy:lint:fix', {
    description: 'Apply clang-format to daisy C++',
    run: shell('sh scripts/clang-format.sh fix daisy'),
  }),
  def('daisy:bench:synth', {
    description: 'Daisy synth micro-benchmark',
    env: { ZSS_DAISY_BENCH: '1' },
    run: exec([
      'npx',
      'tsx',
      'zss/feature/synth/backend/daisy/daisyperfbench.ts',
    ]),
  }),
  def('daisy:regression:test', {
    description: 'Jest + critical Playwright parity gates',
    tags: ['slow'],
    run: exec(['npx', 'tsx', 'scripts/run-daisy-regression.ts']),
  }),
  def('daisy:adsr-parity:test', {
    description: 'Short amsaw ADSR Jest + env parity',
    deps: ['daisy:adsr-parity:jest', 'daisy:env-parity:test'],
    run: { kind: 'tasks' },
  }),
  def('daisy:adsr-parity:jest', {
    description: 'Jest adsrenvcurve tests (internal)',
    run: exec([
      'yarn',
      'jest',
      'zss/feature/synth/backend/wasm/__tests__/adsrenvcurve.test.ts',
    ]),
  }),
  def('daisy:env-parity:test', {
    description: 'Offline env ADSR parity render + gates',
    run: exec(['npx', 'tsx', 'scripts/run-env-parity.ts']),
  }),
  def('daisy:fx-bus-metrics:test', {
    description: 'FX bus metrics offline test',
    run: exec(['npx', 'tsx', 'scripts/run-fx-bus-metrics.ts']),
  }),
  def('daisy:fixtures:regen:drums', {
    description: 'Regenerate daisy drum parity fixtures',
    run: exec(['npx', 'tsx', 'scripts/regen-daisy-drum-parity-fixtures.ts']),
  }),
  def('daisy:fixtures:regen:tone', {
    description: 'Regenerate synth parity fixtures (tone backend)',
    run: exec([
      'npx',
      'tsx',
      'scripts/regen-synth-parity-fixtures.ts',
      '--tone',
    ]),
  }),
  def('daisy:level-issue:song-compare:test', {
    description: 'Compare offline song renders (wasm vs tone)',
    run: exec(['npx', 'tsx', 'scripts/run-level-issue-song-compare.ts']),
  }),
  def('daisy:level-issue:song:render', {
    description: 'Offline song render (wasm)',
    run: exec(['npx', 'tsx', 'scripts/run-song-offline-render.ts']),
  }),
  def('daisy:level-issue:song:render:tone', {
    description: 'Offline song render (tone)',
    run: exec(['npx', 'tsx', 'scripts/run-song-offline-render-tone.ts']),
  }),
  def('daisy:level-issue:voices:render', {
    description: 'Voice isolation offline render',
    run: exec(['npx', 'tsx', 'scripts/run-voice-isolation-render.ts']),
  }),
  def('daisy:level-stability:test', {
    description: 'Level stability offline matrix',
    run: exec(['npx', 'tsx', 'scripts/run-level-stability.ts']),
  }),
  def('daisy:level-stability:test:fxmatrix', {
    description: 'Level stability FX matrix filter',
    run: exec([
      'npx',
      'tsx',
      'scripts/run-level-stability.ts',
      '--filter',
      'fxmatrix',
    ]),
  }),
  def('daisy:pitch-stability:render', {
    description: 'Pitch stability offline render',
    run: exec(['npx', 'tsx', 'scripts/run-pitch-stability.ts']),
  }),
  def('daisy:pitch-stability:test', {
    description: 'Pitch stability gates',
    run: exec(['npx', 'tsx', 'scripts/run-pitch-stability-gates.ts']),
  }),
  parityfull('pitch-stability'),
  def('daisy:play-drum-balance:calibrate', {
    description: 'Calibrate play vs drum balance (slow, dev-only)',
    tags: ['calibrate', 'slow'],
    run: exec(['npx', 'tsx', 'scripts/calibrate-play-drum-balance.ts']),
  }),
  def('daisy:play-drum-balance:render', {
    description: 'Play vs drum balance offline render',
    run: exec(['npx', 'tsx', 'scripts/run-play-drum-balance-render.ts']),
  }),
  def('daisy:play-drum-balance:test', {
    description: 'Play vs drum balance gates',
    run: exec(['npx', 'tsx', 'scripts/run-play-drum-balance-gates.ts']),
  }),
  parityfull('play-drum-balance'),
  def('daisy:play-drum:loop', {
    description: 'Watch native + play-drum parity loop',
    run: exec(['npx', 'tsx', 'scripts/run-play-drum-loop.ts']),
  }),
  def('daisy:sidechain:parity:calibrate', {
    description: 'Calibrate sidechain parity (slow, dev-only)',
    tags: ['calibrate', 'slow'],
    run: exec(['npx', 'tsx', 'scripts/calibrate-sidechain-parity.ts']),
  }),
  def('daisy:sidechain:parity:render', {
    description: 'Sidechain parity offline render',
    run: exec(['npx', 'tsx', 'scripts/run-sidechain-parity.ts']),
  }),
  def('daisy:sidechain:parity:test', {
    description: 'Sidechain parity gates',
    run: exec(['npx', 'tsx', 'scripts/run-sidechain-parity-gates.ts']),
  }),
  parityfull('sidechain:parity'),
  def('daisy:sidechain:loop', {
    description: 'Watch native + sidechain parity loop',
    run: exec(['npx', 'tsx', 'scripts/run-sidechain-loop.ts']),
  }),
  def('daisy:sidechain:render', {
    description: 'Sidechain demo offline render',
    run: exec(['npx', 'tsx', 'scripts/run-sidechain-render.ts']),
  }),
  def('daisy:sidechain:render:ab', {
    description: 'Sidechain demo A/B offline render',
    run: exec(['npx', 'tsx', 'scripts/run-sidechain-render.ts', '--ab']),
  }),
  def('daisy:sos-voice:fixtures:regen', {
    description: 'Regenerate SOS voice parity fixtures',
    run: exec(['npx', 'tsx', 'scripts/regen-sos-voice-fixtures.ts']),
  }),
  def('daisy:sos-voices:test', {
    description: 'SOS voice parity gates',
    run: exec(['npx', 'tsx', 'scripts/run-sos-voice-gates.ts']),
  }),
  tasksonly(
    'daisy:sos-voices:test:full',
    'Regenerate SOS voice fixtures and run gates',
    ['daisy:build', 'daisy:sos-voice:fixtures:regen', 'daisy:sos-voices:test'],
    {
      tags: ['slow'],
    },
  ),
  def('daisy:synth-env:calibrate', {
    description: 'Calibrate synth env parity (slow, dev-only)',
    tags: ['calibrate', 'slow'],
    run: exec(['npx', 'tsx', 'scripts/calibrate-synth-env-parity.ts']),
  }),
  def('daisy:synth-env:render', {
    description: 'Synth env parity offline render',
    run: exec(['npx', 'tsx', 'scripts/run-synth-env-parity.ts']),
  }),
  def('daisy:synth-env:test', {
    description: 'Synth env parity gates',
    run: exec(['npx', 'tsx', 'scripts/run-synth-env-parity-gates.ts']),
  }),
  parityfull('synth-env'),
  def('daisy:synth-env:loop', {
    description: 'Watch native + synth-env parity loop',
    run: exec(['npx', 'tsx', 'scripts/run-synth-env-loop.ts']),
  }),
  def('daisy:notepop:loop', {
    description: 'Watch native + notepop parity loop',
    run: exec(['npx', 'tsx', 'scripts/run-notepop-loop.ts']),
  }),
  def('daisy:notepop:render', {
    description: 'Notepop offline render',
    run: exec(['npx', 'tsx', 'scripts/run-notepop-render.ts']),
  }),
  def('daisy:notepop:render:ab', {
    description: 'Notepop A/B offline render',
    run: exec(['npx', 'tsx', 'scripts/run-notepop-render.ts', '--ab']),
  }),
  def('daisy:notepop:test', {
    description: 'Notepop parity gates',
    run: exec(['npx', 'tsx', 'scripts/run-notepop-gates.ts']),
  }),
  parityfull('notepop', { render: 'daisy:notepop:render:ab' }),
]
