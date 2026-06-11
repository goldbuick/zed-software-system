import { type ProgressInfo, pipeline } from '@huggingface/transformers'
import {
  STT_DTYPE,
  STT_MODEL_DEVICE,
  STT_MODEL_ID,
  STT_TARGET_SAMPLE_RATE,
} from 'zss/feature/stt/sttpreset'

type Transcriber = Awaited<
  ReturnType<typeof pipeline<'automatic-speech-recognition'>>
>

let transcriber: Transcriber | undefined
let transcriberpromise: MAYBE<Promise<Transcriber>>

type MAYBE<T> = T | undefined

function basename(filepath: string): string {
  const slash = filepath.lastIndexOf('/')
  return slash >= 0 ? filepath.slice(slash + 1) : filepath
}

function resamplepcm(
  samples: Float32Array,
  fromrate: number,
  torate: number,
): Float32Array {
  if (fromrate === torate) {
    return samples
  }
  const ratio = fromrate / torate
  const outlength = Math.max(1, Math.floor(samples.length / ratio))
  const out = new Float32Array(outlength)
  for (let i = 0; i < outlength; ++i) {
    const srcidx = i * ratio
    const idx0 = Math.floor(srcidx)
    const idx1 = Math.min(idx0 + 1, samples.length - 1)
    const frac = srcidx - idx0
    out[i] = samples[idx0] * (1 - frac) + samples[idx1] * frac
  }
  return out
}

export async function ensuresttengine(
  onprogress: (phase: string, detail?: string) => void,
  modelid: string = STT_MODEL_ID,
): Promise<Transcriber> {
  if (transcriber) {
    return transcriber
  }
  if (transcriberpromise) {
    return transcriberpromise
  }

  transcriberpromise = (async () => {
    const lastprogress: Record<string, number> = {}
    const progress_callback = (info: ProgressInfo) => {
      switch (info.status) {
        case 'initiate':
        case 'download':
          onprogress('download', basename(info.file))
          break
        case 'progress': {
          const index = `${info.name}-${info.file}`
          const pct = Math.round(info.progress)
          if (pct !== lastprogress[index]) {
            lastprogress[index] = pct
            onprogress('progress', `${pct}%`)
          }
          break
        }
        case 'done':
          onprogress('done', basename(info.file))
          break
      }
    }

    onprogress('load', modelid)
    const pipe = await pipeline('automatic-speech-recognition', modelid, {
      device: STT_MODEL_DEVICE,
      dtype: STT_DTYPE,
      progress_callback,
    })
    transcriber = pipe
    return pipe
  })()

  return transcriberpromise
}

export async function transcribeaudio(
  samples: Float32Array,
  samplerate: number,
  onprogress?: (phase: string, detail?: string) => void,
): Promise<string> {
  const pipe = await ensuresttengine(onprogress ?? (() => {}))
  const pcm =
    samplerate === STT_TARGET_SAMPLE_RATE
      ? samples
      : resamplepcm(samples, samplerate, STT_TARGET_SAMPLE_RATE)
  const result = await pipe(pcm, { sampling_rate: STT_TARGET_SAMPLE_RATE })
  const text =
    typeof result === 'string'
      ? result
      : ((result as { text?: string })?.text ?? '')
  return text.trim()
}

export async function disposesttengine(): Promise<void> {
  if (transcriber) {
    const pipe = transcriber as { dispose?: () => Promise<void> | void }
    if (pipe.dispose) {
      await pipe.dispose()
    }
    transcriber = undefined
  }
  transcriberpromise = undefined
}
