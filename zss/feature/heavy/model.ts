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
        const progress = Math.round(info.progress)
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
      name: 'get_name',
      description: `Get the ai agent's name`,
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current time',
      parameters: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            description: 'The format of the time',
          },
        },
        required: ['format'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_numbers',
      description: 'Adds two numbers',
      parameters: {
        type: 'object',
        properties: {
          a: {
            type: 'number',
            description: 'The first number',
          },
          b: {
            type: 'number',
            description: 'The second number',
          },
        },
        required: ['a', 'b'],
      },
    },
  },
]

const MODEL_TOOLS_LOGIC = {
  async get_name(pid: string) {
    // we need to read the name value from the player flag name
    return `John Doe ${pid}`
  },
  async get_current_time(_pid: string, args: any) {
    const format = args.format ?? 'iso'
    console.info({ format })
    return new Date().toISOString()
  },
  async add_numbers(_pid: string, { a, b }: any) {
    return Number(a) + Number(b)
  },
}

const MODEL_SYSTEM_PROMPT = `You are a character in a video game.
Help the player by performing tasks.
Help the player by answering questions about yourself and the game world.
`

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
function parsetoolcall(content: string): PARSED_TOOL_CALL | null {
  // Strip optional outer brackets e.g. [add_numbers(a=10, b=10)]
  const stripped = content.trim().replace(TOOL_CALL_STRIP_BRACKETS, '$1')
  const match = TOOL_CALL_REGEX_CALL.exec(stripped)
  if (!match) return null
  const name = match[1]
  const argsstr = match[2].trim()
  const args: Record<string, string> = {}
  let argmatch
  while ((argmatch = TOOL_CALL_REGEX_ARG.exec(argsstr)) !== null) {
    const key = argmatch[1] ?? argmatch[4]
    const val = argmatch[3] ?? argmatch[5] ?? ''
    args[key] = String(val)
  }
  // Enforce invariant: only one tool call per content
  if (TOOL_CALL_REGEX_CALL.exec(stripped) !== null) {
    console.info('og content', content)
    throw new Error('Expected at most one tool call in content')
  }
  return { name, args }
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

    console.info('inputs', messages)

    // console.info(
    //   tokenizer.apply_chat_template(convo, {
    //     tokenize: false,
    //     tools: MODEL_TOOLS,
    //     add_generation_prompt: true,
    //   }),
    // )

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

    const toolcalls: PARSED_TOOL_CALL[] = []
    const toolcallscontent: string[] = []
    const responses: string[] = []
    for (let i = 0; i < decoded.length; ++i) {
      const text = decoded[i]
      const stripped = text.replace(/<\|im_end\|>$/, '')
      const check = TOOL_CALL_REGEX.exec(stripped)
      if (check) {
        const content = check[1]
        const call = parsetoolcall(content)
        if (call) {
          toolcallscontent.push(stripped)
          toolcalls.push(call)
        }
      } else {
        responses.push(stripped)
      }
    }

    for (let i = 0; i < toolcalls.length; ++i) {
      const call = toolcalls[i]
      const fn = MODEL_TOOLS_LOGIC[call.name as keyof typeof MODEL_TOOLS_LOGIC]
      if (ispresent(fn)) {
        const result = await fn(pid, call.args)
        const nested = await modelcall([
          ...messages,
          { role: 'assistant', content: toolcallscontent[i] },
          { role: 'tool', content: JSON.stringify(result) },
        ])
        responses.push(nested)
      }
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
