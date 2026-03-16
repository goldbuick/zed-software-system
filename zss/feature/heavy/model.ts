import {
  AutoModelForCausalLM,
  AutoTokenizer,
  Message,
  ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'
import { AGENT_ZSS_COMMANDS } from 'zss/feature/heavy/formatstate'
import {
  getadapter,
  parseresult as llmparseresult,
} from 'zss/feature/heavy/llm'
import type { MODEL_RESULT, TOOL_DEF } from 'zss/feature/heavy/llm'

const DTYPE = 'q4'
const MAX_NEW_TOKENS = 512
const MODEL_DEVICE = 'webgpu'
const MODEL_CONTEXT_TOKENS = 8192
export const MODEL_ID = 'onnx-community/Llama-3.2-1B-Instruct-ONNX'

const CHATML_TEMPLATE = `{% for message in messages %}<|im_start|>{{ message.role }}
{{ message.content }}<|im_end|>
{% endfor %}{% if add_generation_prompt %}<|im_start|>assistant
{% endif %}`

/** Model used only for attention classification (idle → "is this message for this agent?"). Can be a smaller/faster model. */
export const CLASSIFIER_MODEL_ID = 'onnx-community/SmolLM2-360M-ONNX'

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

export const MODEL_TOOLS: TOOL_DEF[] = [
  {
    type: 'function',
    function: {
      name: 'set_agent_name',
      description:
        'Change your display name. Use only when the user explicitly asks you to rename yourself.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The new display name' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: `Execute a ZSS command. ${AGENT_ZSS_COMMANDS} Command must start with #.`,
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description:
              'Full command including #, e.g. #go n, #put n boulder, #change gem empty, #shoot n',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_codepage',
      description:
        'Read the source script of an object, terrain, or board codepage by name.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The codepage name or kind to look up',
          },
          type: {
            type: 'string',
            description:
              'One of: object (default), terrain, board. Defaults to object.',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_path_direction',
      description:
        'Get direction toward or away from (targetx, targety). Returns e.g. north; then use run_command with #go n to move. Use flee=true to move away.',
      parameters: {
        type: 'object',
        properties: {
          targetx: {
            type: 'number',
            description: 'Target x coordinate (board coordinates)',
          },
          targety: {
            type: 'number',
            description: 'Target y coordinate (board coordinates)',
          },
          flee: {
            type: 'boolean',
            description:
              'If true, returns direction away from target. Defaults to false.',
          },
        },
        required: ['targetx', 'targety'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'press_input',
      description:
        'Simulate button presses (up, down, ok, cancel, menu). Use for menus and UI when run_command is not appropriate.',
      parameters: {
        type: 'object',
        properties: {
          inputs: {
            type: 'string',
            description:
              'Comma-separated: up, down, left, right, ok, cancel, menu, shift, alt, ctrl',
          },
        },
        required: ['inputs'],
      },
    },
  },
]

export type { MODEL_RESULT, TOOL_CALL } from 'zss/feature/heavy/llm'

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
          onworking(`${info.file} loading ...`)
          break
        case 'download':
          onworking(`${info.file} downloading ...`)
          break
        case 'progress': {
          const index = `${info.name}-${info.file}`
          const progress = Math.round(info.progress)
          if (progress !== lastprogress[index]) {
            lastprogress[index] = progress
            onworkingprogress(`${info.file} ${progress}% ...`)
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
        dtype: DTYPE,
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
          onworking(`${info.file} loading ...`)
          break
        case 'download':
          onworking(`${info.file} downloading ...`)
          break
        case 'progress': {
          const index = `${info.name}-${info.file}`
          const progress = Math.round(info.progress)
          if (progress !== lastprogress[index]) {
            lastprogress[index] = progress
            onworkingprogress(`${info.file} ${progress}% ...`)
          }
          break
        }
      }
    }

    const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, {
      progress_callback,
    })

    const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
      dtype: DTYPE,
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

  const adapter = getadapter(MODEL_ID)
  if (!adapter) {
    throw new Error(`No LLM adapter registered for model: ${MODEL_ID}`)
  }

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
  const parsed = llmparseresult(raw, adapter.parseoptions)

  if (parsed.toolcalls.length > 0) {
    console.info('[heavy] parsed toolcalls:', parsed.toolcalls)
  }

  return parsed
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
