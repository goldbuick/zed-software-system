import {
  AutoModelForCausalLM,
  AutoTokenizer,
  Message,
  ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'
import {
  HEAVY_LLM_DEFAULT_PRESET,
  type HEAVY_LLM_PRESET,
  HEAVY_LLM_PRESETS,
  type HEAVY_LLM_ROW,
  parseenvheavylmpreset,
} from 'zss/feature/heavy/heavyllmpreset'
import { parseresult as llmparseresult } from 'zss/feature/heavy/llm/parse'
import type { MODEL_RESULT, PARSE_OPTIONS } from 'zss/feature/heavy/llm/types'

const MAX_NEW_TOKENS = 768
const MODEL_DEVICE = 'webgpu'

/** Set from register restore / `#agent model` (worker); when unset, env then default apply. */
let heavylmregisterpreset: HEAVY_LLM_PRESET | undefined

let loadedmaintag: string | undefined

/** Bumped on preset change so in-flight loads discard stale results. */
let heavyllmloadepoch = 0

function resolveheavyllmpresetkey(): HEAVY_LLM_PRESET {
  if (heavylmregisterpreset !== undefined) {
    return heavylmregisterpreset
  }
  return parseenvheavylmpreset() ?? HEAVY_LLM_DEFAULT_PRESET
}

function heavyllmresolvedrow(): HEAVY_LLM_ROW {
  return HEAVY_LLM_PRESETS[resolveheavyllmpresetkey()]
}

/** Apply preset from persisted register or CLI; disposes main generator for reload. */
export function applyheavylmpreset(preset: HEAVY_LLM_PRESET) {
  heavylmregisterpreset = preset
  loadedmaintag = undefined
  heavyllmloadepoch++
  destroymainheavylm()
}

/** Dispose main generator only (keep SmolLM2 classifier). */
export function destroymainheavylm() {
  if (sharedmodel) {
    void sharedmodel.model.dispose()
    sharedmodel = undefined
  }
  sharedmodelpromise = undefined
  loadedmaintag = undefined
}

export function getheavylmeffectivepreset(): HEAVY_LLM_PRESET {
  return resolveheavyllmpresetkey()
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

export type { MODEL_RESULT } from 'zss/feature/heavy/llm/types'

type SHARED_MODEL = {
  tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>
  model: Awaited<ReturnType<typeof AutoModelForCausalLM.from_pretrained>>
}

let sharedmodel: SHARED_MODEL | undefined
let sharedmodelpromise: Promise<SHARED_MODEL> | undefined

let classifiermodel: SHARED_MODEL | undefined
let classifiermodelpromise: Promise<SHARED_MODEL> | undefined

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
    const lastprogress: Record<string, number> = {}

    onworking(`${CLASSIFIER_MODEL_ID} loading ...`)
    const onworkingprogress = throttle(onworking, PROGRESS_THROTTLE_MS)
    function progress_callback(info: ProgressInfo) {
      switch (info.status) {
        case 'initiate':
          onworking(`[${CLASSIFIER_MODEL_ID}] ${info.file} loading ...`)
          break
        case 'download':
          onworking(`[${CLASSIFIER_MODEL_ID}] ${info.file} downloading ...`)
          break
        case 'progress': {
          const index = `${info.name}-${info.file}`
          const progress = Math.round(info.progress)
          if (progress !== lastprogress[index]) {
            lastprogress[index] = progress
            onworkingprogress(`[${info.name}] ${info.file} ${progress}% ...`)
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

function mainmodeltag(cfg: HEAVY_LLM_ROW): string {
  return `${cfg.modelid}\0${cfg.dtype}`
}

async function loadsharedmodel(
  onworking: (message: string) => void,
): Promise<SHARED_MODEL> {
  const cfg = heavyllmresolvedrow()
  const tag = mainmodeltag(cfg)

  if (sharedmodel && loadedmaintag === tag) {
    return sharedmodel
  }

  if (sharedmodelpromise) {
    const prev = sharedmodelpromise
    try {
      await prev
    } catch {
      // stale load aborted
    } finally {
      if (sharedmodelpromise === prev) {
        sharedmodelpromise = undefined
      }
    }
    if (sharedmodel && loadedmaintag === tag) {
      return sharedmodel
    }
  }

  destroymainheavylm()

  const modelid = cfg.modelid
  const modeldtype = cfg.dtype
  const epoch = heavyllmloadepoch

  sharedmodelpromise = (async () => {
    const lastprogress: Record<string, number> = {}

    onworking(`${modelid} loading ...`)
    const onworkingprogress = throttle(onworking, PROGRESS_THROTTLE_MS)
    function progress_callback(info: ProgressInfo) {
      switch (info.status) {
        case 'initiate':
          onworking(`[${modelid}] ${info.file} loading ...`)
          break
        case 'download':
          onworking(`[${modelid}] ${info.file} downloading ...`)
          break
        case 'progress': {
          const index = `${info.name}-${info.file}`
          const progress = Math.round(info.progress)
          if (progress !== lastprogress[index]) {
            lastprogress[index] = progress
            onworkingprogress(`[${info.name}] ${info.file} ${progress}% ...`)
          }
          break
        }
      }
    }

    const tokenizer = await AutoTokenizer.from_pretrained(modelid, {
      progress_callback,
    })

    if (epoch !== heavyllmloadepoch) {
      throw new Error('heavy llm preset changed during load')
    }

    const model = await AutoModelForCausalLM.from_pretrained(modelid, {
      dtype: modeldtype as 'q4f16',
      device: MODEL_DEVICE,
      progress_callback,
    })

    if (epoch !== heavyllmloadepoch) {
      void model.dispose()
      throw new Error('heavy llm preset changed during load')
    }

    const freshcfg = heavyllmresolvedrow()
    const freshtag = mainmodeltag(freshcfg)
    if (freshtag !== tag) {
      void model.dispose()
      throw new Error('heavy llm preset changed during load')
    }

    sharedmodel = { tokenizer, model }
    loadedmaintag = freshtag
    sharedmodelpromise = undefined
    return sharedmodel
  })()

  return sharedmodelpromise
}

function counttokens(
  tokenizer: SHARED_MODEL['tokenizer'],
  text: string,
): number {
  const ids = tokenizer(text, { add_special_tokens: false })
  return (ids.input_ids as { dims: number[] }).dims[1] ?? 0
}

function trimhistory(
  tokenizer: SHARED_MODEL['tokenizer'],
  systemprompt: string,
  messages: Message[],
  contexttokens: number,
): Message[] {
  const systemtokens = counttokens(tokenizer, systemprompt)
  const budget = contexttokens - MAX_NEW_TOKENS - systemtokens
  if (budget <= 0) {
    return []
  }

  let total = 0
  let cutoff = 0
  for (let i = messages.length - 1; i >= 0; --i) {
    const msgtokens = counttokens(
      tokenizer,
      typeof messages[i].content === 'string' ? messages[i].content : '',
    )
    if (total + msgtokens > budget) {
      break
    }
    total += msgtokens
    cutoff = i
  }
  return messages.slice(cutoff)
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

export async function modelgenerate(
  systemprompt: string,
  messages: Message[],
  onworking: (message: string) => void,
  promptlogging = false,
): Promise<MODEL_RESULT> {
  const cfg = heavyllmresolvedrow()
  const { tokenizer, model } = await loadsharedmodel(onworking)

  const trimmed = trimhistory(
    tokenizer,
    systemprompt,
    messages,
    cfg.contexttokens,
  )
  const convo: Message[] = [
    { role: 'system', content: systemprompt },
    ...trimmed,
  ]

  const input = applychattemplate(tokenizer, convo)

  if (promptlogging) {
    const decoded = tokenizer.batch_decode([input.input_ids], {
      skip_special_tokens: false,
    })
    console.info(
      '%c[heavy] decoded input:\n%c%s',
      'color: purple; font-weight: bold',
      'color: red',
      decoded.join(''),
    )
  }

  const onworkingthrottled = throttle(onworking, TOAST_THROTTLE_MS)
  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function() {
      onworkingthrottled(`working ...`)
    },
  })

  onworking(`thinking ...`)
  const { sequences } = (await model.generate({
    ...input,
    streamer,
    do_sample: false,
    max_new_tokens: MAX_NEW_TOKENS,
    return_dict_in_generate: true,
  } as any)) as any

  const values = sequences.slice(null, [input.input_ids.dims[1], null])

  const decoded = tokenizer.batch_decode(values, {
    skip_special_tokens: false,
  })

  const raw = decoded.join('\n').trim()
  return llmparseresult(raw, PARSE_CONFIG)
}

export async function modelclassify(
  messages: Message[],
  onworking: (message: string) => void,
): Promise<string> {
  const { tokenizer, model } = await loadclassifiermodel(onworking)

  const input = applychattemplate(tokenizer, messages)

  onworking(`classifying ...`)
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
