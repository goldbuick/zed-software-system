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
export const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct'

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

const MODEL_TOOLS: TOOL_DEF[] = [
  {
    type: 'function',
    function: {
      name: 'set_agent_name',
      description:
        'Change your display name. Call with the new name only when the user explicitly asks you to rename yourself.',
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
      name: 'get_agent_info',
      description:
        'Get your current identity and location. Returns name, id, board name, and (x,y). Use when the user asks who you are, what your name is, or what board you are on.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'look_at_board',
      description:
        'See your current board: name, your (x,y), objects with positions and [player], terrain summary, exits. Call when you need fresh surroundings or the prompt has no Current context.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: `Execute a single ZSS command (move, place, change, shoot). ${AGENT_ZSS_COMMANDS} Command must start with #. Example: #go n, #put n boulder, #change gem empty, #shoot n.`,
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
        'Read the source script of a codepage by name. Use to understand how an object, terrain, or board works.',
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
        'Get the best direction to move toward or away from a target (x,y). Returns a direction (e.g. north); then use run_command with #go <dir> to move. Coordinates are on the current board.',
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
        'Simulate raw button presses (up, down, ok, cancel, menu). Use for menus when run_command is not the right fit.',
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
  {
    type: 'function',
    function: {
      name: 'list_board_exits',
      description:
        'List boards you can reach from the current board. Returns direction and destination name per exit. Use when the user asks what boards/rooms/areas exist or where they can go.',
      parameters: { type: 'object', properties: {} },
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

  const convo: Message[] = [
    { role: 'system', content: systemprompt },
    ...messages,
  ]

  const templatetools = adapter.toolsfortemplate(MODEL_TOOLS)
  const templateopts = adapter.getchattemplateoptions(templatetools)
  const input = tokenizer.apply_chat_template(convo, {
    tokenize: true,
    return_dict: true,
    ...templateopts,
  } as Parameters<typeof tokenizer.apply_chat_template>[1])
  if (typeof input !== 'object' || !('input_ids' in input)) {
    throw new Error('apply_chat_template returned unexpected type')
  }
  const decodedinput = tokenizer.batch_decode(
    input.input_ids as Parameters<typeof tokenizer.batch_decode>[0],
    { skip_special_tokens: false },
  )
  console.info('input:', decodedinput.join('\n'))

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

  // @ts-expect-error this should be the shape of the input ids
  const values = sequences.slice(null, [input.input_ids.dims[1], null])

  const decoded = tokenizer.batch_decode(values, {
    skip_special_tokens: false,
  })

  const raw = decoded.join('\n').trim()
  const parsed = llmparseresult(raw, adapter.parseoptions)

  // Debug: why no tool calls? Inspect raw model output and parsed result.
  if (parsed.toolcalls.length > 0) {
    console.info('[heavy] parsed toolcalls:', parsed.toolcalls)
  }

  return parsed
}

export async function modelclassify(
  messages: Message[],
  onworking: (message: string) => void,
): Promise<string> {
  const { tokenizer, model } = await loadsharedmodel(onworking)

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
}
