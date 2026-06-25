import { def, jestexec } from '../helpers'
import {
  nodehandler,
  pythonhandler,
  shellhandlerwithargs,
  tsxhandler,
} from '../implementations/modulehandler'
import type { TaskDef } from '../types'

const LANG = 'tasks/implementations/lang'
const FINETUNE = 'tasks/implementations/lang/finetune'

export const LANG_TASKS: TaskDef[] = [
  def('lang:book:oracle:extract', {
    description: 'Extract book JSON into lang integration oracle files',
    run: tsxhandler(`${LANG}/lang-book-oracle-extract.ts`),
  }),
  def('lang:regression:test', {
    description: 'TypeScript lang parser regression tests',
    tags: ['ci'],
    run: shellhandlerwithargs(`${LANG}/run-lang-regression.sh`),
  }),
  def('lang:zztoop:corpus:analyze', {
    description:
      'Analyze Museum ZZT corpus with the vanilla zss/feature/zztoop parser; write ops/fixtures/lang/zztoop/failure-report.json. Flags: raw-only, write-fixtures, limit N, full',
    tags: ['slow'],
    run: tsxhandler(`${LANG}/analyze-zztoop-corpus.ts`),
  }),
  def('lang:build-train-corpus', {
    description: 'Jest build training corpus fixture',
    run: jestexec('ops/tests/unit/feature/heavy/training/buildcorpus.test.ts', [
      '--no-coverage',
    ]),
  }),
  def('lang:train-corpus:test', {
    description: 'Jest train corpus tests',
    run: jestexec('ops/tests/unit/feature/heavy/training/traincorpus.test.ts', [
      '--no-coverage',
    ]),
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
