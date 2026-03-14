/* eslint-disable @typescript-eslint/require-await */
import {
  AutoModelForCausalLM,
  AutoTokenizer,
  Message,
  ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'

const DTYPE = 'q4'
const MODEL_DEVICE = 'webgpu'
const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct'

const MODEL_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'set_agent_name',
      description:
        'Change your display name. Use when asked to rename yourself or given a new name.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The new name',
          },
        },
        required: ['name'],
      },
    },
  },
]

const TOOL_CALL_REGEX = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g

export type TOOL_CALL = { name: string; args: Record<string, string> }

export type MODEL_RESULT = {
  text: string
  toolcalls: TOOL_CALL[]
}

function parseresult(raw: string): MODEL_RESULT {
  const toolcalls: TOOL_CALL[] = []

  TOOL_CALL_REGEX.lastIndex = 0
  let match
  while ((match = TOOL_CALL_REGEX.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      toolcalls.push({
        name: parsed.name ?? '',
        args: parsed.arguments ?? {},
      })
    } catch {
      // skip malformed tool calls
    }
  }

  const text = raw
    .replace(TOOL_CALL_REGEX, '')
    .replace(/<\|[^|]*\|>/g, '')
    .trim()

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

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function() {
      onworking(`working ...`)
    },
  })

  onworking(`thinking ...`)
  const { sequences } = (await model.generate({
    ...input,
    streamer,
    do_sample: false,
    max_new_tokens: 512,
    return_dict_in_generate: true,
  } as any)) as any

  // @ts-expect-error this should be the shape of the input ids
  const values = sequences.slice(null, [input.input_ids.dims[1], null])

  const decoded = tokenizer.batch_decode(values, {
    skip_special_tokens: false,
  })

  return parseresult(decoded.join('\n').trim())
}

export function destroysharedmodel() {
  if (sharedmodel) {
    void sharedmodel.model.dispose()
    sharedmodel = undefined
  }
}
