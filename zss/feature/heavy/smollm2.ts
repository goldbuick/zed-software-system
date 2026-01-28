import {
  Chat,
  Message,
  TextStreamer,
  pipeline,
} from '@huggingface/transformers'
import { isarray, ispresent } from 'zss/mapping/types'

const MODEL_ID = 'HuggingFaceTB/SmolLM2-360M-Instruct'

export type SMOLLM2_OPTIONS = {
  maxtokens?: number
  onWorking?: (message: string) => void
}

/**
 * Detects the best available device for running the model.
 * Checks for WebGPU support first, falls back to CPU.
 */
async function detectdevice(): Promise<'webgpu' | 'cpu'> {
  // Check if WebGPU is available
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) {
        return 'webgpu'
      }
    } catch (error) {
      console.warn('WebGPU detection failed:', error)
    }
  }
  // Fall back to CPU
  return 'cpu'
}

export async function createsmollm2caller(opts: SMOLLM2_OPTIONS = {}) {
  const device = 'cpu' // await detectdevice()
  const maxtokens = opts.maxtokens ?? 320

  opts.onWorking?.(`loading ${MODEL_ID} on ${device}`)
  const generator = await pipeline('text-generation', MODEL_ID, {
    device,
    dtype: device === 'webgpu' ? 'q4f16' : 'q4',
    progress_callback(progress) {
      switch (progress.status) {
        case 'progress':
          opts.onWorking?.(`${progress.file} ${progress.progress}%`)
          break
        case 'done':
          opts.onWorking?.('loading model')
          break
      }
      console.info(progress)
    },
  })

  return async (system: string, user: string): Promise<string> => {
    console.info(system)

    const messages: Message[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      callback_function(text: string) {
        console.info(text)
        // opts.onWorking?.(`working ${text.length}...`)
      },
    })

    opts.onWorking?.('running generator')
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
