import { def, exec, jestexec, shell, tasksonly } from '../helpers'
import {
  shellhandlerwithargs,
  tsxhandler,
} from '../implementations/modulehandler'
import { parityfull } from '../pipelines'
import type { TaskDef } from '../types'

const CLANG = 'tasks/implementations/native/clang-format.sh'
const D = 'tasks/implementations/daisy'
const LOOP = 'tasks/lib/daisy/parity-loop.ts'

export const DAISY_TASKS: TaskDef[] = [
  def('daisy:build', {
    description: 'Build Daisy WASM native synth',
    run: shell('sh zss/feature/synth/backend/daisy/native/build-daisy.sh'),
  }),
  def('daisy:bundle:processor', {
    description: 'Bundle daisy audio worklet processor',
    run: tsxhandler(`${D}/bundle-daisy-processor.ts`),
  }),
  def('daisy:lint', {
    description: 'clang-format check on daisy C++',
    run: shellhandlerwithargs(CLANG, ['check', 'daisy']),
  }),
  def('daisy:lint:fix', {
    description: 'Apply clang-format to daisy C++',
    run: shellhandlerwithargs(CLANG, ['fix', 'daisy']),
  }),
  def('daisy:bench:synth', {
    description: 'Daisy synth micro-benchmark',
    env: { ZSS_DAISY_BENCH: '1' },
    run: exec(['npx', 'tsx', 'ops/lib/daisy-parity/daisyperfbench.ts']),
  }),
  def('daisy:regression:test', {
    description: 'Jest + critical Playwright parity gates',
    tags: ['slow'],
    run: tsxhandler(`${D}/run-daisy-regression.ts`),
  }),
  def('daisy:adsr-parity:test', {
    description: 'Short amsaw ADSR Jest + env parity',
    deps: ['daisy:adsr-parity:jest', 'daisy:env-parity:test'],
    run: { kind: 'tasks' },
  }),
  def('daisy:adsr-parity:jest', {
    description: 'Jest adsrenvcurve tests (internal)',
    run: jestexec(
      'ops/tests/unit/feature/synth/backend/wasm/adsrenvcurve.test.ts',
    ),
  }),
  def('daisy:env-parity:test', {
    description: 'Offline env ADSR parity render + gates',
    run: tsxhandler(`${D}/run-env-parity.ts`),
  }),
  def('daisy:fx-bus-metrics:test', {
    description: 'FX bus metrics offline test',
    run: tsxhandler(`${D}/run-fx-bus-metrics.ts`),
  }),
  def('daisy:fixtures:regen:drums', {
    description: 'Regenerate daisy drum parity fixtures',
    run: tsxhandler(`${D}/regen-daisy-drum-parity-fixtures.ts`),
  }),
  def('daisy:fixtures:regen:tone', {
    description: 'Regenerate synth parity fixtures (tone backend)',
    run: tsxhandler(`${D}/regen-synth-parity-fixtures.ts`, ['--tone']),
  }),
  def('daisy:fixtures:regen:adsrenvcurve:tone', {
    description: 'Regenerate adsrenvcurve tone metrics fixture',
    run: tsxhandler(`${D}/regen-adsrenvcurve-tone-fixture.ts`),
  }),
  def('daisy:fixtures:regen:env-adsr:tone', {
    description: 'Regenerate env ADSR tone parity metrics fixture',
    run: tsxhandler(`${D}/regen-env-adsr-parity-fixtures.ts`),
  }),
  def('daisy:level-issue:song-compare:test', {
    description: 'Compare offline song renders (wasm vs tone)',
    run: tsxhandler(`${D}/run-level-issue-song-compare.ts`),
  }),
  def('daisy:level-issue:song:render', {
    description: 'Offline song render (wasm)',
    run: tsxhandler(`${D}/run-song-offline-render.ts`),
  }),
  def('daisy:level-issue:song:render:tone', {
    description: 'Offline song render (tone)',
    run: tsxhandler(`${D}/run-song-offline-render-tone.ts`),
  }),
  def('daisy:level-issue:voices:render', {
    description: 'Voice isolation offline render',
    run: tsxhandler(`${D}/run-voice-isolation-render.ts`),
  }),
  def('daisy:level-stability:test', {
    description: 'Level stability offline matrix',
    run: tsxhandler(`${D}/run-level-stability.ts`),
  }),
  def('daisy:level-stability:test:fxmatrix', {
    description: 'Level stability FX matrix filter',
    run: tsxhandler(`${D}/run-level-stability.ts`, ['--filter', 'fxmatrix']),
  }),
  def('daisy:pitch-stability:render', {
    description: 'Pitch stability offline render',
    run: tsxhandler(`${D}/run-pitch-stability.ts`),
  }),
  def('daisy:pitch-stability:test', {
    description: 'Pitch stability gates',
    run: tsxhandler(`${D}/run-pitch-stability-gates.ts`),
  }),
  parityfull('pitch-stability'),
  def('daisy:play-drum-balance:calibrate', {
    description: 'Calibrate play vs drum balance (slow, dev-only)',
    tags: ['calibrate', 'slow'],
    run: tsxhandler(`${D}/calibrate-play-drum-balance.ts`),
  }),
  def('daisy:play-drum-balance:render', {
    description: 'Play vs drum balance offline render',
    run: tsxhandler(`${D}/run-play-drum-balance-render.ts`),
  }),
  def('daisy:play-drum-balance:test', {
    description: 'Play vs drum balance gates',
    run: tsxhandler(`${D}/run-play-drum-balance-gates.ts`),
  }),
  parityfull('play-drum-balance'),
  def('daisy:play-drum:loop', {
    description: 'Watch native + play-drum parity loop',
    run: tsxhandler(LOOP, ['--suite', 'play-drum']),
  }),
  def('daisy:sidechain:parity:calibrate', {
    description: 'Calibrate sidechain parity (slow, dev-only)',
    tags: ['calibrate', 'slow'],
    run: tsxhandler(`${D}/calibrate-sidechain-parity.ts`),
  }),
  def('daisy:sidechain:parity:render', {
    description: 'Sidechain parity offline render',
    run: tsxhandler(`${D}/run-sidechain-parity.ts`),
  }),
  def('daisy:sidechain:parity:test', {
    description: 'Sidechain parity gates',
    run: tsxhandler(`${D}/run-sidechain-parity-gates.ts`),
  }),
  parityfull('sidechain:parity'),
  def('daisy:sidechain:loop', {
    description: 'Watch native + sidechain parity loop',
    run: tsxhandler(LOOP, ['--suite', 'sidechain']),
  }),
  def('daisy:sidechain:render', {
    description: 'Sidechain demo offline render',
    run: tsxhandler(`${D}/run-sidechain-render.ts`),
  }),
  def('daisy:sidechain:render:ab', {
    description: 'Sidechain demo A/B offline render',
    run: tsxhandler(`${D}/run-sidechain-render.ts`, ['--ab']),
  }),
  def('daisy:sos-voice:fixtures:regen', {
    description: 'Regenerate SOS voice parity fixtures',
    run: tsxhandler(`${D}/regen-sos-voice-fixtures.ts`),
  }),
  def('daisy:sos-voices:test', {
    description: 'SOS voice parity gates',
    run: tsxhandler(`${D}/run-sos-voice-gates.ts`),
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
    run: tsxhandler(`${D}/calibrate-synth-env-parity.ts`),
  }),
  def('daisy:synth-env:render', {
    description: 'Synth env parity offline render',
    run: tsxhandler(`${D}/run-synth-env-parity.ts`),
  }),
  def('daisy:synth-env:test', {
    description: 'Synth env parity gates',
    run: tsxhandler(`${D}/run-synth-env-parity-gates.ts`),
  }),
  parityfull('synth-env'),
  def('daisy:synth-env:loop', {
    description: 'Watch native + synth-env parity loop',
    run: tsxhandler(LOOP, ['--suite', 'synth-env']),
  }),
  def('daisy:notepop:loop', {
    description: 'Watch native + notepop parity loop',
    run: tsxhandler(LOOP, ['--suite', 'notepop']),
  }),
  def('daisy:notepop:render', {
    description: 'Notepop offline render',
    run: tsxhandler(`${D}/run-notepop-render.ts`),
  }),
  def('daisy:notepop:render:ab', {
    description: 'Notepop A/B offline render',
    run: tsxhandler(`${D}/run-notepop-render.ts`, ['--ab']),
  }),
  def('daisy:notepop:test', {
    description: 'Notepop parity gates',
    run: tsxhandler(`${D}/run-notepop-gates.ts`),
  }),
  parityfull('notepop', { render: 'daisy:notepop:render:ab' }),
]
