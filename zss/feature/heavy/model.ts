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

const MODEL_ID = 'HuggingFaceTB/SmolLM2-1.7B-Instruct'

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

function modelbuildsystemprompt() {
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
  /*

You are given a question and a set of possible functions. 
Based on the question, you can make one or more function/tool calls to achieve the purpose. 
If none of the functions can be used, point it out and refuse to answer. 
If the given question lacks the parameters required by the function, also point it out.

*/
  return `You are a NPC in a video game and you are an expert in composing functions.
Give yourself a name and personality and help the player by answering questions and providing information.

You have access to the following tools:
<tools>${JSON.stringify(tools)}</tools>

The output MUST strictly adhere to the following format, and NO other text MUST be included.
The example format is as follows. Please make sure the parameter type is correct. If no function call is needed, please make the tool calls an empty list '[]'.
<tool_call>[
{"name": "func_name1", "arguments": {"argument1": "value1", "argument2": "value2"}},
... (more tool calls as required)
]</tool_call>`
}

export async function createmodelcaller(onworking: (message: string) => void) {
  const { tokenizer, model } = await loadmodel(MODEL_ID, 'causal', onworking)
  return {
    async call(messages: Message[]) {
      const convo = [
        ...messages,
        {
          role: 'system',
          content: modelbuildsystemprompt(),
        },
      ]

      console.info(
        tokenizer.apply_chat_template(convo, {
          tokenize: false,
          return_dict: false,
          add_generation_prompt: true,
        }),
      )

      const inputs = tokenizer.apply_chat_template(convo, {
        return_dict: true,
        add_generation_prompt: true,
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
        max_new_tokens: 128,
        num_return_sequences: 1,
        top_p: 0.9,
        temperature: 0.2,
        // repetition_penalty: 1.05,
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
