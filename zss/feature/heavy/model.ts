import {
  AutoModelForCausalLM,
  AutoTokenizer,
  Message,
  ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'
import { AGENT_ZSS_COMMANDS } from 'zss/feature/heavy/formatstate'

const DTYPE = 'q4f16'
const MAX_NEW_TOKENS = 512
const MODEL_DEVICE = 'webgpu'
const MODEL_ID = 'onnx-community/Qwen3-0.6B-ONNX'

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

const MODEL_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'setagentname',
      description:
        'Change your display name. Call with the new display name only when the user explicitly asks you to rename yourself.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The new name' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getagentinfo',
      description:
        'Get your current identity and location. Returns your name, id, board name, and (x,y) position. Use when the user asks who you are, what your name is, or what board you are on.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookatboard',
      description:
        'See your current board. Returns board name, your (x,y), objects with positions and [player] marker, terrain summary, exits. Call when you need fresh surroundings or the prompt has no Current context.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'runcommand',
      description: `Execute a single ZSS command as the agent (e.g. move, place, change, shoot). ${AGENT_ZSS_COMMANDS} Command must start with #. Full command including #, e.g. #go n, #put n boulder, #change gem empty, #shoot n.`,
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
      name: 'readcodepage',
      description:
        'Read the source script of a codepage by name. Use to understand how an element, terrain, or board works.',
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
      name: 'pathfind',
      description:
        'Get the best direction to move toward or away from a target position. Returns a direction (e.g. north) and next step; use that with runcommand (#go <dir>) to move. Coordinates are on the current board.',
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
              'If true, direction to move away from target. Defaults to false.',
          },
        },
        required: ['targetx', 'targety'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pressinput',
      description:
        'Simulate raw button presses (e.g. up, down, ok, cancel, menu). Use for menu/interaction when runcommand is not the right fit.',
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
      name: 'getboardlist',
      description:
        'List boards you can reach from the current board (exits). Returns direction and destination board name for each exit. Use when the user asks what boards/rooms/areas are available or where they can go.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

const TOOL_CALL_REGEX = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g
const THINK_REGEX = /<think>[\s\S]*?<\/think>/gi
/** Fallback: Pythonic tool call e.g. get_weather(location="NYC") from some models. */
const PYTHONIC_CALL_REGEX = /(\w+)\s*\(\s*([^)]*)\s*\)/g

export type TOOL_CALL = { name: string; args: Record<string, string> }

export type MODEL_RESULT = {
  text: string
  toolcalls: TOOL_CALL[]
}

function normalizetoolarg(arg: unknown): Record<string, string> {
  if (arg === null || typeof arg !== 'object') {
    return {}
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(arg)) {
    if (typeof v === 'string') {
      out[k] = v
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = JSON.stringify(v)
    } else if (v !== undefined && v !== null) {
      out[k] = String(v)
    }
  }
  return out
}

/** Parse Pythonic args string, e.g. location="New York", unit="fahrenheit" → { location: "New York", unit: "fahrenheit" }. */
function parsepythonicargs(argsstr: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!argsstr.trim()) {
    return out
  }
  let i = 0
  const s = argsstr
  while (i < s.length) {
    while (i < s.length && /[\s,]/.test(s[i])) {
      i++
    }
    if (i >= s.length) {
      break
    }
    const keystart = i
    while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
      i++
    }
    const key = s.slice(keystart, i)
    if (!key) {
      break
    }
    while (i < s.length && s[i] !== '=') {
      i++
    }
    if (i >= s.length || s[i] !== '=') {
      break
    }
    i++
    while (i < s.length && /\s/.test(s[i])) {
      i++
    }
    if (i >= s.length) {
      break
    }
    if (s[i] === '"' || s[i] === "'") {
      const quote = s[i]
      i++
      const valstart = i
      while (i < s.length && s[i] !== quote) {
        if (s[i] === '\\') {
          i++
        }
        i++
      }
      out[key] = s.slice(valstart, i)
      i++
    } else {
      const valstart = i
      while (i < s.length && !/[\s,]/.test(s[i])) {
        i++
      }
      const raw = s.slice(valstart, i).trim()
      out[key] = raw === 'true' ? 'true' : raw === 'false' ? 'false' : raw
    }
  }
  return out
}

/** Find first complete JSON array in string by bracket count; return parsed array and slice, or null. */
function findtoolarray(str: string): { arr: unknown[]; slice: string } | null {
  const start = str.indexOf('[')
  if (start === -1) {
    return null
  }
  let depth = 0
  let instring = false
  let escape = false
  let quote = ''
  for (let i = start; i < str.length; i++) {
    const c = str[i]
    if (escape) {
      escape = false
      continue
    }
    if (instring) {
      if (c === '\\') {
        escape = true
      } else if (c === quote) {
        instring = false
      }
      continue
    }
    if (c === '"' || c === "'") {
      instring = true
      quote = c
      continue
    }
    if (c === '[') {
      depth++
    } else if (c === ']') {
      depth--
      if (depth === 0) {
        const slice = str.slice(start, i + 1)
        try {
          const arr = JSON.parse(slice) as unknown
          return Array.isArray(arr) ? { arr, slice } : null
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function parseresult(raw: string): MODEL_RESULT {
  const toolcalls: TOOL_CALL[] = []
  let text = raw

  TOOL_CALL_REGEX.lastIndex = 0
  let match
  while ((match = TOOL_CALL_REGEX.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      toolcalls.push({
        name: parsed.name ?? '',
        args: normalizetoolarg(parsed.arguments),
      })
    } catch {
      // skip malformed tool calls
    }
  }

  text = text.replace(TOOL_CALL_REGEX, '').trim()

  const arrayresult = findtoolarray(text)
  if (arrayresult) {
    for (const item of arrayresult.arr) {
      if (item && typeof item === 'object' && 'name' in item) {
        const name = (item as { name?: unknown }).name
        const args = (item as { arguments?: unknown }).arguments
        toolcalls.push({
          name: typeof name === 'string' ? name : '',
          args: normalizetoolarg(args),
        })
      }
    }
    text = text.replace(arrayresult.slice, '').trim()
  }

  text = text.replace(PYTHONIC_CALL_REGEX, (_full, name, argsstr) => {
    toolcalls.push({ name, args: parsepythonicargs(argsstr) })
    return ' '
  })
  text = text.trim()

  text = text.replace(/<\|[^|]*\|>/g, '').trim()
  text = text.replace(THINK_REGEX, '').trim()

  return { text, toolcalls }
}

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

  const convo: Message[] = [
    { role: 'system', content: systemprompt },
    ...messages,
  ]

  // Chat template: HF docs say any extra kwargs are passed into the template.
  // Qwen3 template supports enable_thinking; TS types don't list it so we cast.
  const input = tokenizer.apply_chat_template(convo, {
    tokenize: true,
    return_dict: true,
    tools: MODEL_TOOLS,
    add_generation_prompt: true,
    enable_thinking: false,
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
  const parsed = parseresult(raw)

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
