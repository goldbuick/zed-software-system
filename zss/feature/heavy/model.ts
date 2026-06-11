import {
  AutoModelForCausalLM,
  AutoProcessor,
  AutoTokenizer,
  Gemma4ForConditionalGeneration,
  Message,
  ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'
import { prepareforheavyload } from 'zss/feature/gpu/gpuheavyload'
import {
  HEAVY_LLM_PRESETS,
  type HEAVY_LLM_ROW,
} from 'zss/feature/heavy/heavyllmpreset'
import { heavyagenttoolschemas } from 'zss/feature/heavy/llm/agenttools'
import { parseresult as llmparseresult } from 'zss/feature/heavy/llm/parse'
import {
  parsetoolcallsfromassistant,
  validatedzsslinetoolcalls,
} from 'zss/feature/heavy/llm/parsetoolcalls'
import type { ParsedScriptToolCall } from 'zss/feature/heavy/llm/scripttool'
import { validatedscripttoolcalls } from 'zss/feature/heavy/llm/scripttool'
import type { PARSE_OPTIONS } from 'zss/feature/heavy/llm/types'

const MAX_NEW_TOKENS = 768
const MODEL_DEVICE = 'webgpu'

const AGENT_MODEL_ROW = HEAVY_LLM_PRESETS.gemma

let loadedmaintag: string | undefined

/** Bumped on reload so in-flight loads discard stale results. */
let heavyllmloadepoch = 0

/** Dispose main generator only (keep SmolLM2 classifier). */
export function destroymainheavylm() {
  disposegemmaifloaded()
  loadedmaintag = undefined
}

/** No-op: only Gemma 4 E2B is supported. */
export function applyheavylmpreset() {
  loadedmaintag = undefined
  heavyllmloadepoch++
  destroymainheavylm()
}

export function getheavylmeffectivepreset(): 'gemma' {
  return 'gemma'
}

/** Attention / intent classifier: small instruct model (q4 on WebGPU). */
const CLASSIFIER_MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX-MHA'
const CLASSIFIER_DTYPE = 'q4'

const CHATML_TEMPLATE = `{% for message in messages %}<|im_start|>{{ message.role }}
{{ message.content }}<|im_end|>
{% endfor %}{% if add_generation_prompt %}<|im_start|>assistant
{% endif %}`

const PARSE_CONFIG: PARSE_OPTIONS = {
  stripThink: true,
  stripSpecialTokens: true,
}

/** Minimum ms between progress/toast updates to avoid flooding the main thread. */
const TOAST_THROTTLE_MS = 50
const PROGRESS_THROTTLE_MS = 100

function basename(filepath: string): string {
  const slash = filepath.lastIndexOf('/')
  return slash >= 0 ? filepath.slice(slash + 1) : filepath
}

function throttle(
  fn: (message: string) => void,
  intervalms: number,
): (message: string) => void {
  let last = 0
  return (message: string) => {
    const now = Date.now()
    if (now - last >= intervalms) {
      last = now
      fn(message)
    }
  }
}

export type MODEL_GENERATE_GEMMA_RESULT = {
  raw: string
  text: string
  toolcommandlines: string[]
  scripttoolcalls: ParsedScriptToolCall[]
}

type TOKENIZERISH = (
  text: string,
  options?: object,
) => { input_ids: { dims: number[] } }

type SHARED_MODEL = {
  tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>
  model: Awaited<ReturnType<typeof AutoModelForCausalLM.from_pretrained>>
}

type SHARED_GEMMA4 = {
  processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>
  model: Awaited<
    ReturnType<typeof Gemma4ForConditionalGeneration.from_pretrained>
  >
}

let sharedgemma4: SHARED_GEMMA4 | undefined
let sharedgemma4promise: Promise<SHARED_GEMMA4> | undefined

let classifiermodel: SHARED_MODEL | undefined
let classifiermodelpromise: Promise<SHARED_MODEL> | undefined

function disposegemmaifloaded() {
  if (sharedgemma4) {
    void sharedgemma4.model.dispose()
    sharedgemma4 = undefined
  }
  sharedgemma4promise = undefined
}

function mainmodeltag(cfg: HEAVY_LLM_ROW): string {
  return `${cfg.backend}\0${cfg.modelid}\0${cfg.dtype}`
}

function counttokens(tokenizer: TOKENIZERISH, text: string): number {
  const ids = tokenizer(text, { add_special_tokens: false })
  return (ids.input_ids as { dims: number[] }).dims[1] ?? 0
}

function messagetokentext(m: Message & { name?: string }): string {
  if (typeof m.content !== 'string') {
    return JSON.stringify(m.content)
  }
  if (m.role === 'tool' && typeof m.name === 'string') {
    return `${m.role}\n${m.name}\n${m.content}`
  }
  return `${m.role}\n${m.content}`
}

function trimhistorygemma(
  tokenizer: TOKENIZERISH,
  systemprompt: string,
  messages: (Message & { name?: string })[],
  contexttokens: number,
): (Message & { name?: string })[] {
  const systemtokens = counttokens(tokenizer, systemprompt)
  const budget = contexttokens - MAX_NEW_TOKENS - systemtokens
  if (budget <= 0) {
    return []
  }

  let total = 0
  let cutoff = 0
  for (let i = messages.length - 1; i >= 0; --i) {
    const msgtokens = counttokens(tokenizer, messagetokentext(messages[i]))
    if (total + msgtokens > budget) {
      break
    }
    total += msgtokens
    cutoff = i
  }
  return messages.slice(cutoff)
}

async function loadclassifiermodel(
  onworking: (message: string) => void,
): Promise<SHARED_MODEL> {
  if (classifiermodel) {
    return classifiermodel
  }
  if (classifiermodelpromise) {
    return classifiermodelpromise
  }

  classifiermodelpromise = (async () => {
    await prepareforheavyload()

    const lastprogress: Record<string, number> = {}

    onworking(`llm load`)
    const onworkingprogress = throttle(onworking, PROGRESS_THROTTLE_MS)
    function progress_callback(info: ProgressInfo) {
      switch (info.status) {
        case 'initiate':
          onworking(`llm dl ${basename(info.file)}`)
          break
        case 'download':
          onworking(`llm dl ${basename(info.file)}`)
          break
        case 'progress': {
          const index = `${info.name}-${info.file}`
          const progress = Math.round(info.progress)
          if (progress !== lastprogress[index]) {
            lastprogress[index] = progress
            onworkingprogress(`llm dl ${progress}%`)
          }
          break
        }
      }
    }

    const tokenizer = await AutoTokenizer.from_pretrained(CLASSIFIER_MODEL_ID, {
      progress_callback,
    })

    const model = await AutoModelForCausalLM.from_pretrained(
      CLASSIFIER_MODEL_ID,
      {
        dtype: CLASSIFIER_DTYPE,
        device: MODEL_DEVICE,
        progress_callback,
      },
    )

    classifiermodel = { tokenizer, model }
    classifiermodelpromise = undefined
    return classifiermodel
  })()

  return classifiermodelpromise
}

async function loadsharedgemma4model(
  onworking: (message: string) => void,
): Promise<SHARED_GEMMA4> {
  const cfg = AGENT_MODEL_ROW
  const tag = mainmodeltag(cfg)

  if (sharedgemma4 && loadedmaintag === tag) {
    return sharedgemma4
  }

  if (sharedgemma4promise) {
    const prev = sharedgemma4promise
    try {
      await prev
    } catch {
      // stale load aborted
    } finally {
      if (sharedgemma4promise === prev) {
        sharedgemma4promise = undefined
      }
    }
    if (sharedgemma4 && loadedmaintag === tag) {
      return sharedgemma4
    }
  }

  destroymainheavylm()

  const modelid = cfg.modelid
  const modeldtype = cfg.dtype
  const epoch = heavyllmloadepoch

  sharedgemma4promise = (async () => {
    await prepareforheavyload()

    const lastprogress: Record<string, number> = {}

    onworking(`llm load`)
    const onworkingprogress = throttle(onworking, PROGRESS_THROTTLE_MS)
    function progress_callback(info: ProgressInfo) {
      switch (info.status) {
        case 'initiate':
          onworking(`llm dl ${basename(info.file)}`)
          break
        case 'download':
          onworking(`llm dl ${basename(info.file)}`)
          break
        case 'progress': {
          const index = `${info.name}-${info.file}`
          const progress = Math.round(info.progress)
          if (progress !== lastprogress[index]) {
            lastprogress[index] = progress
            onworkingprogress(`llm dl ${progress}%`)
          }
          break
        }
      }
    }

    const processor = await AutoProcessor.from_pretrained(modelid, {
      progress_callback,
    })

    if (epoch !== heavyllmloadepoch) {
      throw new Error('heavy llm preset changed during load')
    }

    const model = await Gemma4ForConditionalGeneration.from_pretrained(
      modelid,
      {
        dtype: modeldtype as 'q4f16',
        device: MODEL_DEVICE,
        progress_callback,
      },
    )

    if (epoch !== heavyllmloadepoch) {
      void model.dispose()
      throw new Error('heavy llm preset changed during load')
    }

    const freshtag = mainmodeltag(AGENT_MODEL_ROW)
    if (freshtag !== tag) {
      void model.dispose()
      throw new Error('heavy llm preset changed during load')
    }

    sharedgemma4 = { processor, model }
    loadedmaintag = freshtag
    sharedgemma4promise = undefined
    return sharedgemma4
  })()

  return sharedgemma4promise
}

function applychattemplate(
  tokenizer: SHARED_MODEL['tokenizer'],
  convo: Message[],
): { input_ids: any; attention_mask?: any } {
  try {
    const input = tokenizer.apply_chat_template(convo, {
      tokenize: true,
      return_dict: true,
      add_generation_prompt: true,
    })
    if (typeof input === 'object' && input !== null && 'input_ids' in input) {
      return input as { input_ids: any; attention_mask?: any }
    }
  } catch {
    // model has no built-in chat template; fall through to ChatML
  }
  const input = tokenizer.apply_chat_template(convo, {
    tokenize: true,
    return_dict: true,
    add_generation_prompt: true,
    chat_template: CHATML_TEMPLATE,
  } as Parameters<typeof tokenizer.apply_chat_template>[1])
  if (typeof input !== 'object' || input === null || !('input_ids' in input)) {
    throw new Error('apply_chat_template returned unexpected type')
  }
  return input as { input_ids: any; attention_mask?: any }
}

export async function modelgenerategemma4(
  systemprompt: string,
  messages: (Message & { name?: string })[],
  onworking: (message: string) => void,
): Promise<MODEL_GENERATE_GEMMA_RESULT> {
  const cfg = AGENT_MODEL_ROW
  const { processor, model } = await loadsharedgemma4model(onworking)
  const tokenizer = processor.tokenizer
  if (!tokenizer) {
    throw new Error('gemma processor missing tokenizer')
  }

  const trimmed = trimhistorygemma(
    tokenizer as TOKENIZERISH,
    systemprompt,
    messages,
    cfg.contexttokens,
  )
  const convo: (Message & { name?: string })[] = [
    { role: 'system', content: systemprompt },
    ...trimmed,
  ]

  const promptstring = processor.apply_chat_template(
    convo as Message[],
    {
      tools: heavyagenttoolschemas(),
      enable_thinking: false,
      add_generation_prompt: true,
    } as Parameters<typeof processor.apply_chat_template>[1],
  ) as string

  const input = await processor(promptstring, undefined, undefined, {
    add_special_tokens: false,
  })

  const onworkingthrottled = throttle(onworking, TOAST_THROTTLE_MS)
  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function() {
      onworkingthrottled(`llm work`)
    },
  })

  onworking(`llm think`)
  const { sequences } = (await model.generate({
    ...input,
    streamer,
    do_sample: false,
    max_new_tokens: MAX_NEW_TOKENS,
    return_dict_in_generate: true,
  })) as any

  const values = sequences.slice(null, [input.input_ids.dims[1], null])

  const decoded = processor.batch_decode(values, {
    skip_special_tokens: true,
  })

  const raw = decoded.join('').trim()
  const parsedcalls = parsetoolcallsfromassistant(raw)
  const toolcommandlines = validatedzsslinetoolcalls(parsedcalls)
  const scripttoolcalls = validatedscripttoolcalls(parsedcalls)
  if (toolcommandlines.length > 0 || scripttoolcalls.length > 0) {
    return { raw, text: '', toolcommandlines, scripttoolcalls }
  }
  const cleaned = llmparseresult(raw, PARSE_CONFIG)
  return { raw, text: cleaned.text, toolcommandlines: [], scripttoolcalls: [] }
}

export async function modelclassify(
  messages: Message[],
  onworking: (message: string) => void,
): Promise<string> {
  const { tokenizer, model } = await loadclassifiermodel(onworking)

  const input = applychattemplate(tokenizer, messages)

  onworking(`llm classify`)
  const { sequences } = (await model.generate({
    ...input,
    do_sample: false,
    max_new_tokens: 10,
    return_dict_in_generate: true,
  } as any)) as any

  const values = sequences.slice(null, [input.input_ids.dims[1], null])

  const decoded = tokenizer.batch_decode(values, {
    skip_special_tokens: true,
  })

  return decoded.join('').trim().toLowerCase()
}

export function destroysharedmodel() {
  destroymainheavylm()
  if (classifiermodel) {
    void classifiermodel.model.dispose()
    classifiermodel = undefined
  }
  classifiermodelpromise = undefined
}
