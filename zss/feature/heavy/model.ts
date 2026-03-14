import {
  AutoModelForCausalLM,
  AutoTokenizer,
  Message,
  ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'

const DTYPE = 'q4f16'
const MAX_NEW_TOKENS = 512
const MODEL_DEVICE = 'webgpu'
/** Qwen2.5-1.5B ONNX for WebGPU; supports tool calling via <tool_call> JSON. */
const MODEL_ID = 'onnx-community/Qwen2.5-1.5B-Instruct'

/** Minimum ms between progress/toast updates to avoid flooding the main thread. */
const TOAST_THROTTLE_MS = 600
const PROGRESS_THROTTLE_MS = 500

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
      name: 'set_agent_name',
      description:
        'Change your display name. Use when the user asks you to rename yourself.',
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
      name: 'get_agent_info',
      description:
        'Get your current identity and location. Returns your name, board, and position. Use when the user asks who you are, what your name is, or what board you are on.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'look_at_board',
      description:
        'See your current board. Returns board name, your position, objects, terrain, and board exits. Use when the user asks where you are, what board you are on, or what is around you.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description:
        'Execute a ZSS command. Examples: #put n boulder, #change gem empty, #shoot n, #go e',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The full command string starting with #',
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
        'Read the source script of a codepage by name. Use to understand how an element or board works.',
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
              'Codepage type: object, terrain, or board. Defaults to object.',
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
        'Get the best direction to move toward or away from a target position.',
      parameters: {
        type: 'object',
        properties: {
          target_x: { type: 'number', description: 'Target x coordinate' },
          target_y: { type: 'number', description: 'Target y coordinate' },
          flee: {
            type: 'boolean',
            description: 'If true, move away from target. Defaults to false.',
          },
        },
        required: ['target_x', 'target_y'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'press_input',
      description:
        'Simulate player button presses. Triggers movement, interaction, and menus like a real player.',
      parameters: {
        type: 'object',
        properties: {
          inputs: {
            type: 'string',
            description:
              'Comma-separated inputs: up, down, left, right, ok, cancel, menu, shift, alt, ctrl',
          },
        },
        required: ['inputs'],
      },
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
          const progress = Math.round(info.progress / 10) * 10
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

  const input = tokenizer.apply_chat_template(convo, {
    tokenize: true,
    return_dict: true,
    tools: MODEL_TOOLS,
    add_generation_prompt: true,
  })
  if (typeof input !== 'object') {
    throw new Error('apply_chat_template returned unexpected type')
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

  // @ts-expect-error this should be the shape of the input ids
  const values = sequences.slice(null, [input.input_ids.dims[1], null])

  const decoded = tokenizer.batch_decode(values, {
    skip_special_tokens: false,
  })

  return parseresult(decoded.join('\n').trim())
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
