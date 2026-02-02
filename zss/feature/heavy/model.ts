// This file manages loading and running models with @huggingface/transformers
import {
  AutoModelForCausalLM,
  AutoModelForSeq2SeqLM,
  AutoTokenizer,
  Message,
  ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'

type MODEL_CATEGORY = 'causal' | 'seq2seq'

export const MODEL_ID = 'onnx-community/LFM2-700M-ONNX'

async function loadmodel(
  modelname: string,
  category: MODEL_CATEGORY,
  onworking: (message: string) => void,
) {
  function progress_callback(info: ProgressInfo) {
    switch (info.status) {
      case 'initiate':
        onworking(`${info.name} ${info.file} loading ...`)
        break
      case 'download':
        onworking(`${info.file} downloading ...`)
        break
      case 'progress':
        onworking(`${info.file} ${Math.round(info.progress)} ...`)
        break
    }
  }

  const tokenizer = await AutoTokenizer.from_pretrained(modelname, {
    progress_callback,
  })

  const dtype = 'q4'
  const device = 'webgpu'
  switch (category) {
    case 'causal': {
      const model = await AutoModelForCausalLM.from_pretrained(modelname, {
        dtype,
        device,
        progress_callback,
      })
      return { tokenizer, model }
    }
    case 'seq2seq': {
      const model = await AutoModelForSeq2SeqLM.from_pretrained(modelname, {
        dtype,
        device,
        progress_callback,
      })
      return { tokenizer, model }
    }
    default:
      throw new Error(`Unknown model category: ${category as string}`)
  }
}

export async function createmodelcaller(
  modelname: string,
  category: MODEL_CATEGORY,
  onworking: (message: string) => void,
) {
  const { tokenizer, model } = await loadmodel(modelname, category, onworking)
  return {
    async call(messages: Message[]) {
      const tools = [
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

      console.info(
        tokenizer.apply_chat_template(messages, {
          tools,
          tokenize: false,
          return_dict: false,
          add_generation_prompt: true,
          // chat_template: CHAT_TEMPLATE,
        }),
      )

      const inputs = tokenizer.apply_chat_template(messages, {
        tools,
        return_dict: true,
        add_generation_prompt: true,
        // chat_template: CHAT_TEMPLATE,
      })
      if (typeof inputs !== 'object') {
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
      const output = await model.generate({
        ...inputs,
        streamer,
        do_sample: false,
        max_new_tokens: 512,
      } as any)

      const decoded = tokenizer.decode(
        // @ts-expect-error yes it's complicated
        output.slice(0, [inputs.input_ids.dims[1], null]),
        { skip_special_tokens: true },
      )

      return decoded
    },
    destroy() {
      void model.dispose()
    },
  }
}

export type MODEL_CALLER = Awaited<ReturnType<typeof createmodelcaller>>
