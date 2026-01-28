import { Message, TextStreamer, pipeline } from '@huggingface/transformers'
import { isarray, ispresent } from 'zss/mapping/types'

const MODEL_ID = 'HuggingFaceTB/SmolLM2-360M-Instruct'

export type SMOLLM2_OPTIONS = {
  maxtokens?: number
  onWorking?: (message: string) => void
}

export async function createsmollm2caller(opts: SMOLLM2_OPTIONS = {}) {
  const maxtokens = opts.maxtokens ?? 320

  opts.onWorking?.(`loading ${MODEL_ID}`)
  const generator = await pipeline('text-generation', MODEL_ID, {
    progress_callback(progress) {
      switch (progress.status) {
        case 'progress': {
          const amount = Math.round(progress.progress * 10)
          opts.onWorking?.(`${progress.file} ${amount}/1000`)
          break
        }
        case 'done':
          opts.onWorking?.('loading model')
          break
      }
    },
  })

  return async (system: string, user: string): Promise<string> => {
    // structured input
    const messages: Message[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]

    // streaming output to show work in progress
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      callback_function() {
        opts.onWorking?.(`working ...`)
      },
    })

    const output = await generator(messages, {
      max_new_tokens: maxtokens,
      streamer,
    })

    let generatedtext: Message[] = []
    if (isarray(output)) {
      const [first] = output
      if (ispresent(first) && 'generated_text' in first) {
        generatedtext = first.generated_text as Message[]
      }
    }

    // grab assisstant messages
    const responsetext = generatedtext
      .filter((message) => message.role === 'assistant')
      .map((message) => message.content)

    return responsetext.join('\n').trim()
  }
}

export type LLM_CALLER = Awaited<ReturnType<typeof createsmollm2caller>>
