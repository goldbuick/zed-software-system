import { def, exec, shell } from '../helpers'
import type { TaskDef } from '../types'

export const LANG_TASKS: TaskDef[] = [
  def('lang:build', {
    description: 'Build lang WASM via emscripten',
    run: shell('sh zss/feature/lang/backend/wasm/build-lang.sh'),
  }),
  def('lang:compile', {
    description: 'Compile ZSS source to JS via wasm (pass file path as args)',
    run: exec(['node', 'scripts/compile-lang.mjs']),
  }),
  def('lang:lint', {
    description: 'clang-format check on lang C++',
    run: shell('sh scripts/clang-format.sh check lang'),
  }),
  def('lang:lint:fix', {
    description: 'Apply clang-format to lang C++',
    run: shell('sh scripts/clang-format.sh fix lang'),
  }),
  def('lang:bench:compile', {
    description: 'Lang compile benchmark report',
    run: exec(['node', 'scripts/lang-compile-bench-report.mjs']),
  }),
  def('lang:parity:test', {
    description: 'Native C++ compile parity vs TS oracle',
    tags: ['ci'],
    run: exec([
      'yarn',
      'jest',
      'zss/feature/lang/backend/wasm/__tests__/wasmparity.test.ts',
      '--no-coverage',
    ]),
  }),
  def('lang:parity:fixtures:regen', {
    description: 'Regenerate lang wasm parity fixtures',
    env: { REGEN_LANG_FIXTURES: '1' },
    run: exec([
      'yarn',
      'jest',
      'zss/feature/lang/backend/wasm/__tests__/regenfixtures.test.ts',
      '--no-coverage',
    ]),
  }),
  def('lang:corpus:test', {
    description: 'Browser zss_lang.wasm against full corpus',
    run: exec(['node', 'scripts/test-lang-corpus.mjs']),
  }),
  def('lang:wasm:test', {
    description: 'Lang wasm smoke test (empty fixture)',
    run: exec(['node', 'scripts/test-lang-wasm.mjs']),
  }),
  def('lang:regression:test', {
    description: 'Full lang regression (TS tests, parity, corpus)',
    tags: ['ci'],
    run: shell('sh scripts/run-lang-regression.sh'),
  }),
  def('lang:build-train-corpus', {
    description: 'Jest build training corpus fixture',
    run: exec([
      'yarn',
      'jest',
      'zss/feature/heavy/training/__tests__/buildcorpus.test.ts',
      '--no-coverage',
    ]),
  }),
  def('lang:train-corpus:test', {
    description: 'Jest train corpus tests',
    run: exec([
      'yarn',
      'jest',
      'zss/feature/heavy/training/__tests__/traincorpus.test.ts',
      '--no-coverage',
    ]),
  }),
  def('lang:finetune:train', {
    description: 'Train lang finetune model',
    run: exec(['python3', 'scripts/lang-finetune/train.py']),
  }),
  def('lang:finetune:export', {
    description: 'Export finetune model to ONNX',
    run: exec(['python3', 'scripts/lang-finetune/export_onnx.py']),
  }),
  def('lang:finetune:eval', {
    description: 'Evaluate finetune ONNX model',
    run: exec(['node', 'scripts/lang-finetune/eval-onnx.mjs']),
  }),
]
