#!/usr/bin/env node
/**
 * Smoke-check fine-tuned ONNX model id env before preset swap.
 * Run: ZSS_HEAVY_LLM_GEMMA_MODEL_ID=your-org/model yarn lang:finetune:eval
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
const EVAL = path.join(ROOT, 'fixtures/generated/training/eval.jsonl')
const MODEL_ID =
  process.env.ZSS_HEAVY_LLM_GEMMA_MODEL_ID ??
  process.env.ZSS_HF_ONNX_REPO ??
  ''

function main() {
  if (!MODEL_ID) {
    console.log(
      'lang finetune eval: set ZSS_HEAVY_LLM_GEMMA_MODEL_ID to run Transformers.js smoke test',
    )
    console.log('corpus eval rows:', readFileSync(EVAL, 'utf8').trim().split('\n').length)
    process.exit(0)
  }

  console.log(`finetune eval gate: model=${MODEL_ID}`)
  console.log(
    'Run full inference smoke in CI GPU job or locally with @huggingface/transformers',
  )
  console.log(`eval.jsonl lines: ${readFileSync(EVAL, 'utf8').trim().split('\n').filter(Boolean).length}`)
}

main()
