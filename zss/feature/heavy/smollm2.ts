import { AutoTokenizer, env as tfEnv } from '@huggingface/transformers'
import { InferenceSession, Tensor, env } from 'onnxruntime-web'
import { cachedfetch } from 'zss/feature/heavy/modelcache'

const MODEL_ID = 'HuggingFaceTB/SmolLM2-1.7B-Instruct'
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

/** Format system + user into SmolLM2 chat template (system\\n...\\n\\nuser\\n...\\n). */
function formatprompt(system: string, user: string): string {
  return `system\n${system}\n\nuser\n${user}\n`
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
    if (!Number.isFinite(v)) throw new Error('smollm2onnx: non-finite logit')
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

async function loadsession(
  _config: SMOLLM2_CONFIG,
  opts: SMOLLM2_OPTIONS,
): Promise<InferenceSession> {
  env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/'
  env.wasm.numThreads = 1
  env.wasm.simd = true

  const useFp16 = opts.useFp16 ?? opts.provider === 'webgpu'
  const modelFile = useFp16 ? 'model_q4f16.onnx' : 'model_q4.onnx'
  const modelUrl = `${BASE}/onnx/${modelFile}`

  const res = await cachedfetch(modelUrl)
  const modelBuffer = await res.arrayBuffer()

  const provider = opts.provider ?? 'webgpu'
  const session = await InferenceSession.create(modelBuffer, {
    executionProviders: [provider],
  })

  return session
}

/** Create tokenizer from HuggingFace. */
async function loadtokenizer() {
  tfEnv.allowRemoteModels = true
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID)
  return tokenizer
}

type SMOLLM2_STATE = {
  config: SMOLLM2_CONFIG
  session: InferenceSession
  tokenizer: Awaited<ReturnType<typeof loadtokenizer>>
  feed: Record<string, Tensor>
  kvDims: number[]
  dtype: 'float32' | 'float16'
  numLayers: number
  eos: number
}

function disposefeedgpubuffers(feed: Record<string, Tensor>): void {
  for (const name of Object.keys(feed)) {
    const t = feed[name]
    if (
      t &&
      'location' in t &&
      (t as { location?: string }).location === 'gpu-buffer'
    ) {
      ;(t as { dispose?: () => void }).dispose?.()
    }
  }
}

function initfeed(state: SMOLLM2_STATE): void {
  const { dtype, numLayers, kvDims } = state
  disposefeedgpubuffers(state.feed)
  state.feed = {}
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
  const { feed } = state
  for (const name of Object.keys(outputs)) {
    if (!name.startsWith('present.')) continue
    const pastName = name.replace('present.', 'past_key_values.')
    const existing = feed[pastName]
    if (
      existing &&
      'location' in existing &&
      (existing as { location?: string }).location === 'gpu-buffer'
    ) {
      ;(existing as { dispose?: () => void }).dispose?.()
    }
    feed[pastName] = outputs[name]
  }
}

export async function createsmollm2caller(
  opts: SMOLLM2_OPTIONS = {},
): Promise<LLM_CALLER> {
  const config = await loadconfig()
  const [session, tokenizer] = await Promise.all([
    loadsession(config, opts),
    loadtokenizer(),
  ])

  const headDim = config.hidden_size / config.num_attention_heads
  const kvDims: number[] = [1, config.num_key_value_heads, 0, headDim]
  const useFp16 = opts.useFp16 ?? opts.provider === 'webgpu'
  const dtype = useFp16 ? 'float16' : 'float32'

  const state: SMOLLM2_STATE = {
    config,
    session,
    tokenizer,
    feed: {},
    kvDims,
    dtype: dtype,
    numLayers: config.num_hidden_layers,
    eos: config.eos_token_id,
  }
  initfeed(state)

  const maxTokens = opts.maxTokens ?? 128

  return async (systemPrompt: string, userContent: string): Promise<string> => {
    const prompt = formatprompt(systemPrompt, userContent)
    const enc = await tokenizer(prompt, {
      return_tensor: false,
      padding: true,
      truncation: true,
      max_length: 2048,
    })
    const raw = (enc as { input_ids?: number[] | number[][] }).input_ids
    const inputIds = Array.isArray(raw?.[0])
      ? (raw as number[][])[0]
      : ((raw as number[]) ?? [])
    if (!inputIds.length) return ''

    initfeed(state)
    const outputTokens: number[] = [...inputIds]
    let seqLen = outputTokens.length
    const inputLen = inputIds.length

    state.feed.input_ids = new Tensor(
      'int64',
      BigInt64Array.from(inputIds.map(BigInt)),
      [1, inputIds.length],
    )
    state.feed.position_ids = new Tensor(
      'int64',
      BigInt64Array.from({ length: inputLen }, (_, i) =>
        BigInt(seqLen - inputLen + i),
      ),
      [1, inputLen],
    )

    let lastToken = -1
    while (lastToken !== state.eos && seqLen < maxTokens) {
      state.feed.attention_mask = new Tensor(
        'int64',
        BigInt64Array.from({ length: seqLen }, () => 1n),
        [1, seqLen],
      )
      const outputs = (await state.session.run(state.feed)) as Record<
        string,
        Tensor
      >
      const logits = outputs.logits
      if (!logits) throw new Error('smollm2onnx: missing logits')
      lastToken = argmax(logits)
      outputTokens.push(lastToken)
      seqLen = outputTokens.length

      updatekvcache(state, outputs)
      state.feed.input_ids = new Tensor(
        'int64',
        BigInt64Array.from([BigInt(lastToken)]),
        [1, 1],
      )
      state.feed.position_ids = new Tensor(
        'int64',
        BigInt64Array.from([BigInt(seqLen - 1)]),
        [1, 1],
      )
    }

    const generated = outputTokens.slice(inputIds.length)
    const text = tokenizer.decode(generated, { skip_special_tokens: true })
    return typeof text === 'string' ? text : ''
  }
}
