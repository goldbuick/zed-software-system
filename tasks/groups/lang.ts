import { def, exec, jestexec, shell } from '../helpers'
import {
  nodehandler,
  pythonhandler,
  shellhandlerwithargs,
  tsxhandler,
} from '../implementations/modulehandler'
import type { TaskDef } from '../types'

const CLANG = 'tasks/implementations/native/clang-format.sh'
const LANG = 'tasks/implementations/lang'
const FINETUNE = 'tasks/implementations/lang/finetune'

export const LANG_TASKS: TaskDef[] = [
  def('lang:build', {
    description: 'Build lang WASM via emscripten',
    run: shell('sh zss/feature/lang/backend/wasm/build-lang.sh'),
  }),
  def('lang:compile', {
    description: 'Compile ZSS source to JS via wasm (pass file path as args)',
    run: nodehandler(`${LANG}/compile-lang.mjs`),
  }),
  def('lang:lint', {
    description: 'clang-format check on lang C++',
    run: shellhandlerwithargs(CLANG, ['check', 'lang']),
  }),
  def('lang:lint:fix', {
    description: 'Apply clang-format to lang C++',
    run: shellhandlerwithargs(CLANG, ['fix', 'lang']),
  }),
  def('lang:bench:compile', {
    description: 'Lang compile benchmark report',
    run: nodehandler(`${LANG}/lang-compile-bench-report.mjs`),
  }),
  def('lang:bench:wasm', {
    description: 'Emscripten zss_compile wall time benchmark',
    run: nodehandler(`${LANG}/lang-wasm-bench.mjs`),
  }),
  def('lang:compare:browser-native', {
    description:
      'Compare browser vs native lang compile for simple chat player',
    run: nodehandler(`${LANG}/compare-browser-native-compile.mjs`),
  }),
  def('lang:compare:simple-chat-labels', {
    description: 'Compare simple chat player wasm label maps',
    run: nodehandler(`${LANG}/compare-simple-chat-labels.mjs`),
  }),
  def('lang:book:oracle:extract', {
    description: 'Extract book JSON into lang integration oracle files',
    run: tsxhandler(`${LANG}/lang-book-oracle-extract.ts`),
  }),
  def('lang:parity:test', {
    description: 'Native C++ compile parity vs TS oracle',
    tags: ['ci'],
    run: jestexec(
      'ops/tests/unit/feature/lang/backend/wasm/__tests__/wasmparity.test.ts',
      ['--no-coverage'],
    ),
  }),
  def('lang:parity:fixtures:regen', {
    description: 'Regenerate lang wasm parity fixtures',
    env: { REGEN_LANG_FIXTURES: '1' },
    run: jestexec(
      'ops/tests/unit/feature/lang/backend/wasm/__tests__/regenfixtures.test.ts',
      ['--no-coverage'],
    ),
  }),
  def('lang:corpus:test', {
    description: 'Browser zss_lang.wasm against full corpus',
    run: nodehandler(`${LANG}/test-lang-corpus.mjs`),
  }),
  def('lang:wasm:test', {
    description: 'Lang wasm smoke test (empty fixture)',
    run: nodehandler(`${LANG}/test-lang-wasm.mjs`),
  }),
  def('lang:regression:test', {
    description: 'Full lang regression (TS tests, parity, corpus)',
    tags: ['ci'],
    run: shellhandlerwithargs(`${LANG}/run-lang-regression.sh`),
  }),
  def('lang:zzt:corpus:analyze', {
    description:
      'Analyze Museum ZZT corpus raw stat.code compile rate; write ops/fixtures/lang/zzt/failure-report.json',
    tags: ['slow'],
    run: tsxhandler(`${LANG}/analyze-zzt-corpus.ts`),
  }),
  def('lang:build-train-corpus', {
    description: 'Jest build training corpus fixture',
    run: jestexec(
      'ops/tests/unit/feature/heavy/training/__tests__/buildcorpus.test.ts',
      ['--no-coverage'],
    ),
  }),
  def('lang:train-corpus:test', {
    description: 'Jest train corpus tests',
    run: jestexec(
      'ops/tests/unit/feature/heavy/training/__tests__/traincorpus.test.ts',
      ['--no-coverage'],
    ),
  }),
  def('lang:finetune:train', {
    description: 'Train lang finetune model',
    run: pythonhandler(`${FINETUNE}/train.py`),
  }),
  def('lang:finetune:export', {
    description: 'Export finetune model to ONNX',
    run: pythonhandler(`${FINETUNE}/export_onnx.py`),
  }),
  def('lang:finetune:eval', {
    description: 'Evaluate finetune ONNX model',
    run: nodehandler(`${FINETUNE}/eval-onnx.mjs`),
  }),
]
