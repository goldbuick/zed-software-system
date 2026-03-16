import {
  AutoModelForCausalLM,
  AutoTokenizer,
  Message,
  ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'
import { parseresult as llmparseresult } from 'zss/feature/heavy/llm'
import type { MODEL_RESULT, PARSE_OPTIONS } from 'zss/feature/heavy/llm'

const MAX_NEW_TOKENS = 512
const MODEL_DEVICE = 'webgpu'
const MODEL_CONTEXT_TOKENS = 8192
export const MODEL_ID = 'onnx-community/Qwen3-0.6B-ONNX'
const MODEL_DTYPE = 'q4f16'

const CHATML_TEMPLATE = `{% for message in messages %}<|im_start|>{{ message.role }}
{{ message.content }}<|im_end|>
{% endfor %}{% if add_generation_prompt %}<|im_start|>assistant
{% endif %}`

/** Model used only for attention classification (idle -> "is this message for this agent?"). Can be a smaller/faster model. */
export const CLASSIFIER_MODEL_ID = 'onnx-community/SmolLM2-360M-ONNX'
const CLASSIFIER_DTYPE = 'q4'

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

export type { MODEL_RESULT } from 'zss/feature/heavy/llm'

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

async function loadsharedmodel(
  onworking: (message: string) => void,
): Promise<SHARED_MODEL> {
  if (sharedmodel) {
    return sharedmodel
  }
  if (sharedmodelpromise) {
    return sharedmodelpromise
  }

  sharedmodelpromise = (async () => {
    const lastprogress: Record<string, number> = {}

    onworking(`${MODEL_ID} loading ...`)
    const onworkingprogress = throttle(onworking, PROGRESS_THROTTLE_MS)
    function progress_callback(info: ProgressInfo) {
      switch (info.status) {
        case 'initiate':
          onworking(`[${MODEL_ID}] ${info.file} loading ...`)
          break
        case 'download':
          onworking(`[${MODEL_ID}] ${info.file} downloading ...`)
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

    const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, {
      progress_callback,
    })

    const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
      dtype: MODEL_DTYPE,
      device: MODEL_DEVICE,
      progress_callback,
    })

    sharedmodel = { tokenizer, model }
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
): Message[] {
  const systemtokens = counttokens(tokenizer, systemprompt)
  const budget = MODEL_CONTEXT_TOKENS - MAX_NEW_TOKENS - systemtokens
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
): Promise<MODEL_RESULT> {
  const { tokenizer, model } = await loadsharedmodel(onworking)

  const trimmed = trimhistory(tokenizer, systemprompt, messages)
  const convo: Message[] = [
    { role: 'system', content: systemprompt },
    ...trimmed,
  ]

  const input = applychattemplate(tokenizer, convo)

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

  const input = tokenizer.apply_chat_template(messages, {
    tokenize: true,
    return_dict: true,
    add_generation_prompt: true,
  })
  if (typeof input !== 'object') {
    throw new Error('apply_chat_template returned unexpected type')
  }

  onworking(`classifying ...`)
  const { sequences } = (await model.generate({
    ...input,
    do_sample: false,
    max_new_tokens: 3,
    return_dict_in_generate: true,
  } as any)) as any

  // @ts-expect-error this should be the shape of the input ids
  const values = sequences.slice(null, [input.input_ids.dims[1], null])

  const decoded = tokenizer.batch_decode(values, {
    skip_special_tokens: true,
  })

  return decoded.join('').trim().toLowerCase()
}

export function destroysharedmodel() {
  if (sharedmodel) {
    void sharedmodel.model.dispose()
    sharedmodel = undefined
  }
  if (classifiermodel) {
    void classifiermodel.model.dispose()
    classifiermodel = undefined
  }
}
