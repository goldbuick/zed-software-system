import {
  AutoTokenizer,
  PreTrainedTokenizer,
  env as tfEnv,
} from '@huggingface/transformers'
import { InferenceSession, Tensor, env } from 'onnxruntime-web'
import { cachedfetch } from 'zss/feature/heavy/modelcache'
import { ispresent } from 'zss/mapping/types'

const MODEL_ID = 'HuggingFaceTB/SmolLM2-360M-Instruct'
const BASE = `https://huggingface.co/${MODEL_ID}/resolve/main`

type SMOLLM2_CONFIG = {
  eos_token_id: number
  num_hidden_layers: number
  num_attention_heads: number
  num_key_value_heads: number
  hidden_size: number
}

export type LLM_CALLER = (
  systemPrompt: string,
  userContent: string,
) => Promise<string>

export type SMOLLM2_OPTIONS = {
  maxTokens?: number
  provider?: 'webgpu' | 'wasm'
  useFp16?: boolean
}

/** Format system + user into SmolLM2 chat template (system\\n...\\n\\nuser\\n...\\n\\n). */
function formatprompt(system: string, user: string): string {
  return `system\n${system}\n\nuser\n${user}\n\n`
}

/** Greedy argmax over last token logits [1, seq, vocab]. */
function argmax(logits: Tensor): number {
  const arr = logits.data as Float32Array | Float64Array
  const [, seq, vocab] = logits.dims
  const start = (seq - 1) * vocab
  let max = arr[start]
  let maxIdx = 0
  for (let i = 0; i < vocab; i++) {
    const v = arr[start + i]
    if (!Number.isFinite(v)) throw new Error('smollm2: non-finite logit')
    if (v > max) {
      max = v
      maxIdx = i
    }
  }
  return maxIdx
}

async function loadconfig(): Promise<SMOLLM2_CONFIG> {
  const res = await cachedfetch(`${BASE}/config.json`)
  const json = (await res.json()) as SMOLLM2_CONFIG
  return json
}

async function loadsession(opts: SMOLLM2_OPTIONS): Promise<InferenceSession> {
  env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/'

  const provider = opts.provider ?? 'webgpu'
  const useFp16 = opts.useFp16 ?? provider === 'webgpu'
  const modelFile = useFp16 ? 'model_q4f16.onnx' : 'model_q4.onnx'
  const modelUrl = `${BASE}/onnx/${modelFile}`

  const res = await cachedfetch(modelUrl)
  const modelBuffer = await res.arrayBuffer()

  const session = await InferenceSession.create(modelBuffer, {
    executionProviders: [provider],
  })

  return session
}

/** Create tokenizer from HuggingFace. */
async function loadtokenizer(): Promise<PreTrainedTokenizer> {
  tfEnv.allowRemoteModels = true
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID)
  return tokenizer
}

type SMOLLM2_STATE = {
  config: SMOLLM2_CONFIG
  session: InferenceSession
  tokenizer: PreTrainedTokenizer
  feed: Record<string, Tensor>
  kvDims: number[]
  dtype: 'float32' | 'float16'
  numLayers: number
  eos: number
}

function initfeed(state: SMOLLM2_STATE): void {
  const { dtype, numLayers, kvDims } = state

  // dispose any existing GPU buffers
  for (const name of Object.keys(state.feed)) {
    const t = state.feed[name]
    if (ispresent(t) && t.location === 'gpu-buffer') {
      t.dispose?.()
    }
  }

  // reset feed entries
  state.feed = {}

  // create new feed entries
  const empty = dtype === 'float16' ? new Uint16Array() : new Float32Array()
  const shape = kvDims as [number, number, number, number]
  for (let i = 0; i < numLayers; i++) {
    state.feed[`past_key_values.${i}.key`] = new Tensor(dtype, empty, shape)
    state.feed[`past_key_values.${i}.value`] = new Tensor(dtype, empty, shape)
  }
}

function updatekvcache(
  state: SMOLLM2_STATE,
  outputs: Record<string, Tensor>,
): void {
  for (const name of Object.keys(outputs)) {
    if (!name.startsWith('present.')) continue
    const pastName = name.replace('present.', 'past_key_values.')
    const t = state.feed[pastName]
    // dispose any existing GPU buffers
    if (ispresent(t) && t.location === 'gpu-buffer') {
      t.dispose?.()
    }
    state.feed[pastName] = outputs[name]
  }
}

export async function createsmollm2caller(
  opts: SMOLLM2_OPTIONS = {},
): Promise<LLM_CALLER> {
  const config = await loadconfig()
  const session = await loadsession(opts)
  const tokenizer = await loadtokenizer()

  const maxTokens = opts.maxTokens ?? 2048
  const provider = opts.provider ?? 'webgpu'
  const useFp16 = opts.useFp16 ?? provider === 'webgpu'
  const headDim = config.hidden_size / config.num_attention_heads
  const kvDims: number[] = [1, config.num_key_value_heads, 0, headDim]
  const dtype = useFp16 ? 'float16' : 'float32'

  const state: SMOLLM2_STATE = {
    config,
    kvDims,
    session,
    tokenizer,
    feed: {},
    dtype: dtype,
    numLayers: config.num_hidden_layers,
    eos: config.eos_token_id,
  }

  return async (systemPrompt: string, userContent: string): Promise<string> => {
    // reset feed entries
    initfeed(state)

    const prompt = formatprompt(systemPrompt, userContent)
    const inputIds = [
      ...tokenizer.encode(prompt, { add_special_tokens: true }),
      // include EOS token in input IDs
      // so that we can stop generating when we see it
      state.eos,
    ]
    if (!inputIds.length) {
      return ''
    }

    state.feed.input_ids = new Tensor(
      'int64',
      BigInt64Array.from(inputIds.map(BigInt)),
      [1, inputIds.length],
    )
    state.feed.position_ids = new Tensor(
      'int64',
      BigInt64Array.from({ length: inputIds.length }, (_, i) => BigInt(i)),
      [1, inputIds.length],
    )

    const outputTokens: number[] = []
    while (outputTokens.length < maxTokens) {
      const seqLen = inputIds.length + outputTokens.length
      state.feed.attention_mask = new Tensor(
        'int64',
        BigInt64Array.from({ length: seqLen }, () => 1n),
        [1, seqLen],
      )

      const outputs = await state.session.run(state.feed)
      const logits = outputs.logits
      if (!logits) {
        throw new Error('smollm2: missing logits')
      }

      updatekvcache(state, outputs)

      // Check for EOS before adding to output
      const lastToken = argmax(logits)
      if (lastToken === state.eos) {
        break
      }

      outputTokens.push(lastToken)

      // Set up for next iteration: input is the newly generated token
      // Position should be seqLen (the position of the token we just generated)
      state.feed.input_ids = new Tensor(
        'int64',
        BigInt64Array.from([BigInt(lastToken)]),
        [1, 1],
      )
      state.feed.position_ids = new Tensor(
        'int64',
        BigInt64Array.from([BigInt(seqLen)]),
        [1, 1],
      )
    }

    return tokenizer.decode(outputTokens, { skip_special_tokens: true })
  }
}
