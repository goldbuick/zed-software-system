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

export const MODEL_ID = 'HuggingFaceTB/SmolLM2-1.7B-Instruct'

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

  const dtype = 'q4f16'
  switch (category) {
    case 'causal': {
      const model = await AutoModelForCausalLM.from_pretrained(modelname, {
        dtype,
        progress_callback,
      })
      return { tokenizer, model }
    }
    case 'seq2seq': {
      const model = await AutoModelForSeq2SeqLM.from_pretrained(modelname, {
        dtype,
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

      const inputs = tokenizer.apply_chat_template(messages, {
        tools,
        padding: true,
        tokenize: true,
        truncation: true,
        add_generation_prompt: true,
        return_dict: true,
      })
      if (typeof inputs !== 'object') {
        throw new Error('apply_chat_template returned unexpected type')
      }

      const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        callback_function(text: string) {
          console.info(text)
          onworking(`working ...`)
        },
      })

      onworking(`starting work ...`)
      const output = await model.generate({
        ...inputs,
        streamer,
        max_new_tokens: 512,
      } as any)

      const decoded = tokenizer.decode(
        output.slice(0, [inputs.input_ids.dims[1], null]),
        { skip_special_tokens: false },
      )

      console.info(decoded)

      return ''

      // const decoded = tokenizer.decode(
      //   output.slice(0, [inputs.input_ids.dims[1], null]),
      //   { skip_special_tokens: false },
      // )
      // console.info(decoded)

      // console.info(textinputs)
      // if (!isstring(textinputs)) {
      //   throw new Error('apply_chat_template returned unexpected type')
      // }

      // const { input_ids } = tokenizer(textinputs, {
      //   padding: true,
      //   truncation: true,
      //   add_special_tokens: false,
      // })
      // if (!(input_ids instanceof Tensor)) {
      //   throw new Error('tokenizer returned unexpected type')
      // }

      // const outputs = await model.generate({
      //   inputs: input_ids,
      //   streamer,
      // })
      // if (!(outputs instanceof Tensor)) {
      //   throw new Error('model.generate returned unexpected type')
      // }

      // return tokenizer.decode(outputs, {
      //   skip_special_tokens: true,
      // })
    },
    destroy() {
      void model.dispose()
    },
  }
}

export type MODEL_CALLER = Awaited<ReturnType<typeof createmodelcaller>>
