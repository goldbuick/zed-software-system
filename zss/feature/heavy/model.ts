// This file manages loading and running models with @huggingface/transformers
import {
  AutoModelForCausalLM,
  AutoModelForSeq2SeqLM,
  AutoTokenizer,
  Message,
  Tensor,
} from '@huggingface/transformers'

type MODEL_CATEGORY = 'causal' | 'seq2seq'

export const SMOLLM2_MODEL_ID = 'HuggingFaceTB/SmolLM2-1.7B-Instruct'

async function loadmodel(modelname: string, category: MODEL_CATEGORY) {
  const tokenizer = await AutoTokenizer.from_pretrained(modelname)
  switch (category) {
    case 'causal': {
      const model = await AutoModelForCausalLM.from_pretrained(modelname, {
        dtype: 'q4f16',
      })
      return { tokenizer, model }
    }
    case 'seq2seq': {
      const model = await AutoModelForSeq2SeqLM.from_pretrained(modelname)
      return { tokenizer, model }
    }
    default:
      throw new Error(`Unknown model category: ${category as string}`)
  }
}

export async function createmodelcaller(
  modelname: string,
  category: MODEL_CATEGORY,
) {
  const { tokenizer, model } = await loadmodel(modelname, category)
  return {
    async call(messages: Message[]) {
      const input = tokenizer.apply_chat_template(messages, {
        tools: [
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
        ],
        return_tensor: true,
        add_generation_prompt: false,
      })
      if (!(input instanceof Tensor)) {
        throw new Error('apply_chat_template returned unexpected type')
      }

      const response = await model.generate({
        inputs: input,
      })
      if (!(response instanceof Tensor)) {
        throw new Error('model.generate returned unexpected type')
      }

      return tokenizer.decode(response, { skip_special_tokens: true })
    },
    destroy() {
      void model.dispose()
    },
  }
}

export type MODEL_CALLER = Awaited<ReturnType<typeof createmodelcaller>>
