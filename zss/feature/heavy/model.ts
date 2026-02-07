// This file manages loading and running models with @huggingface/transformers
import {
  AutoModelForCausalLM,
  AutoModelForSeq2SeqLM,
  AutoTokenizer,
  Message,
  ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'

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

const MODEL_ID = 'onnx-community/LFM2-350M-ONNX'
const MODEL_TOOLS = [
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
]

const MODEL_TOOLS_LOGIC = {
  // eslint-disable-next-line @typescript-eslint/require-await
  async get_current_time(format: string) {
    console.info({ format })
    return new Date().toISOString()
  },
}

const MODEL_SYSTEM_PROMPT = `You are a non-player character in a video game.
Give yourself a name and describe your personality.
Help the player by answering questions and providing information.

<|tool_call_start|> should use JSON to output function calls.
`

const TOOL_CALL_REGEX = /<\|tool_call_start\|>(.*?)<\|tool_call_end\|>/g

export async function createmodelcaller(onworking: (message: string) => void) {
  let pastvalues: any = undefined
  const { tokenizer, model } = await loadmodel(MODEL_ID, 'causal', onworking)
  return {
    async call(messages: Message[], add_generation_prompt = true) {
      const convo = [
        { role: 'system', content: MODEL_SYSTEM_PROMPT },
        ...messages,
      ]
      console.info(
        tokenizer.apply_chat_template(convo, {
          tokenize: false,
          tools: MODEL_TOOLS,
          add_generation_prompt,
        }),
      )

      const input = tokenizer.apply_chat_template(convo, {
        tokenize: true,
        return_dict: true,
        tools: MODEL_TOOLS,
        add_generation_prompt,
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

      // track past values
      pastvalues = past_key_values

      // @ts-expect-error this should be the shape of the input ids
      const values = sequences.slice(null, [input.input_ids.dims[1], null])

      // Decode the generated text with special tokens preserved (except final <|im_end|>) for tool call detection
      const decoded = tokenizer.batch_decode(values, {
        skip_special_tokens: false,
      })

      const mapped = decoded.map((text) => {
        const check = text.match(TOOL_CALL_REGEX)
        console.info({ text, check })
        return text.replace(/<\|im_end\|>$/, '')
      })

      return mapped[0]
    },
    clearpastvalues() {
      pastvalues = undefined
    },
    destroy() {
      void model.dispose()
    },
  }
}

export type MODEL_CALLER = Awaited<ReturnType<typeof createmodelcaller>>
