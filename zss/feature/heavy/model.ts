/* eslint-disable @typescript-eslint/require-await */
// This file manages loading and running models with @huggingface/transformers
import {
  AutoModelForCausalLM,
  AutoModelForSeq2SeqLM,
  AutoTokenizer,
  Message,
  ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'
import { ispresent } from 'zss/mapping/types'

import { formatsystemprompt } from './formatstate'

// config values here
const DTYPE = 'q4'
const DEVICE = 'webgpu'

async function loadmodel(
  modelid: string,
  category: 'causal' | 'seq2seq',
  onworking: (message: string) => void,
) {
  const lastprogress: Record<string, number> = {}

  onworking(`${modelid} loading ...`)
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
          onworking(`${info.file} ${progress}% ...`)
        }
        break
      }
    }
  }

  const tokenizer = await AutoTokenizer.from_pretrained(modelid, {
    progress_callback,
  })

  switch (category) {
    case 'causal': {
      const model = await AutoModelForCausalLM.from_pretrained(modelid, {
        dtype: DTYPE,
        device: DEVICE,
        progress_callback,
      })
      return { tokenizer, model }
    }
    case 'seq2seq': {
      const model = await AutoModelForSeq2SeqLM.from_pretrained(modelid, {
        dtype: DTYPE,
        device: DEVICE,
        progress_callback,
      })
      return { tokenizer, model }
    }
    default:
      throw new Error(`Unknown model category: ${category as string}`)
  }
}

const MODEL_ID = 'onnx-community/LFM2-700M-ONNX'

const MODEL_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_agent_name',
      description: 'Gets the name given to the agent.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_agent_board',
      description:
        'Gets where the agent is located. Returns the board id the agent is on.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_agent_location',
      description:
        'Gets where the agent is located. Returns the board id the agent is on.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
]

const MODEL_TOOLS_LOGIC = {
  async get_agent_name(pid: string) {
    // we need to read the name value from the player flag name
    return pid
  },
  async get_agent_board(pid: string) {
    // we need to read the id from the player's current board
    return pid
  },
  async get_agent_location(pid: string) {
    // we need to read the id from the player's current board
    return pid
  },
}

const MODEL_SYSTEM_PROMPT = formatsystemprompt()

// Match tool call start and end
const TOOL_CALL_REGEX = /<\|tool_call_start\|>([\s\S]*?)<\|tool_call_end\|>/

// Match function name and arguments
const TOOL_CALL_REGEX_CALL = /(\w+)\s*\(\s*([^)]*)\s*\)/g

// Match key=value where value is quoted string, number, or unquoted identifier
const TOOL_CALL_REGEX_ARG =
  /(\w+)\s*=\s*(["'])([^"']*)\2|(\w+)\s*=\s*(\d+|\w+)/g

// Strip optional outer brackets e.g. [add_numbers(a=10, b=10)]
const TOOL_CALL_STRIP_BRACKETS = /^\[(.*)\]$/s

type PARSED_TOOL_CALL = { name: string; args: Record<string, string> }

function gettoolparamnames(name: string): string[] {
  const def = MODEL_TOOLS.find((t) => t.function.name === name)
  const params = def?.function?.parameters as
    | { required?: string[] }
    | undefined
  return params?.required ?? []
}

/** Split args string by comma, respecting quoted strings. */
function splitargsbycomma(argsstr: string): string[] {
  const out: string[] = []
  let buf = ''
  let inQuote: string | null = null
  for (let i = 0; i < argsstr.length; i++) {
    const c = argsstr[i]
    if (c === '"' || c === "'") {
      if (inQuote === c) inQuote = null
      else inQuote ??= c
      buf += c
    } else if (c === ',' && !inQuote) {
      out.push(buf.trim())
      buf = ''
    } else {
      buf += c
    }
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}

export function parsetoolcalls(content: string): PARSED_TOOL_CALL[] {
  const stripped = content.trim().replace(TOOL_CALL_STRIP_BRACKETS, '$1')
  const matches = [...stripped.matchAll(TOOL_CALL_REGEX_CALL)]
  const calls: PARSED_TOOL_CALL[] = []
  for (const match of matches) {
    const name = match[1]
    const argsstr = match[2].trim()
    const args: Record<string, string> = {}
    let argmatch
    TOOL_CALL_REGEX_ARG.lastIndex = 0
    while ((argmatch = TOOL_CALL_REGEX_ARG.exec(argsstr)) !== null) {
      const key = argmatch[1] ?? argmatch[4]
      const val = argmatch[3] ?? argmatch[5] ?? ''
      args[key] = String(val)
    }
    const paramnames = gettoolparamnames(name)
    if (paramnames.length > 0 && Object.keys(args).length === 0) {
      const parts = splitargsbycomma(argsstr)
      for (let i = 0; i < paramnames.length && i < parts.length; i++) {
        args[paramnames[i]] = parts[i].replace(/^["']|["']$/g, '')
      }
    }
    calls.push({ name, args })
  }
  return calls
}

export async function createmodelcaller(
  pid: string,
  onworking: (message: string) => void,
) {
  let pastvalues: any = undefined
  const { tokenizer, model } = await loadmodel(MODEL_ID, 'causal', onworking)
  async function modelcall(messages: Message[]) {
    const convo: Message[] = [
      { role: 'system', content: MODEL_SYSTEM_PROMPT },
      ...messages,
    ]

    console.info(
      tokenizer.apply_chat_template(convo, {
        tokenize: false,
        tools: MODEL_TOOLS,
        add_generation_prompt: true,
      }),
    )

    const input = tokenizer.apply_chat_template(convo, {
      tokenize: true,
      return_dict: true,
      tools: MODEL_TOOLS,
      add_generation_prompt: true,
    })
    if (typeof input !== 'object') {
      throw new Error('apply_chat_template returned unexpected type')
    }

    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: false,
      callback_function() {
        onworking(`working ...`)
      },
    })

    onworking(`starting work ...`)
    const { sequences, past_key_values } = (await model.generate({
      ...input,
      streamer,
      do_sample: false,
      max_new_tokens: 512,
      past_key_values: pastvalues,
      return_dict_in_generate: true,
    } as any)) as any

    pastvalues = past_key_values

    // @ts-expect-error this should be the shape of the input ids
    const values = sequences.slice(null, [input.input_ids.dims[1], null])

    const decoded = tokenizer.batch_decode(values, {
      skip_special_tokens: false,
    })

    const responses: string[] = []
    const toolcalls: string[] = []
    const toolresponses: string[] = []
    for (let i = 0; i < decoded.length; ++i) {
      const text = decoded[i]
      const stripped = text.replace(/<\|im_end\|>$/, '')
      const check = TOOL_CALL_REGEX.exec(stripped)
      if (check) {
        toolcalls.push(stripped)
        const content = check[1]
        const calls = parsetoolcalls(content)
        for (let c = 0; c < calls.length; ++c) {
          const call = calls[c]
          const fn =
            MODEL_TOOLS_LOGIC[call.name as keyof typeof MODEL_TOOLS_LOGIC]
          if (ispresent(fn)) {
            // @ts-expect-error this should be the shape of the function
            const result = await fn(pid, call.args)
            toolresponses.push(`${result}`)
          } else {
            toolresponses.push('function not found')
          }
        }
      } else {
        responses.push(stripped)
      }
    }

    // fold in tool calls and responses
    if (toolcalls.length > 0) {
      const nested = await modelcall([
        ...messages,
        ...toolcalls.map((content) => ({
          role: 'assistant',
          content,
        })),
        ...toolresponses.map((content) => ({
          role: 'tool',
          content,
        })),
      ])
      responses.push(nested)
    }

    return responses.join('\n')
  }

  return {
    call: modelcall,
    clearpastvalues() {
      pastvalues = undefined
    },
    destroy() {
      void model.dispose()
    },
  }
}

export type MODEL_CALLER = Awaited<ReturnType<typeof createmodelcaller>>
