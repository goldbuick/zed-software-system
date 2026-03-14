import { RawAudio, normalizepeak, trimsilence } from './utils'

const SUPERTONIC_MODEL = 'onnx-community/Supertonic-TTS-2-ONNX'
const VOICES = ['M1', 'M2', 'F1', 'F2'] as const
const SAMPLE_RATE = 44100

function voiceembeddingurl(voice: string) {
  return `https://huggingface.co/${SUPERTONIC_MODEL}/resolve/main/voices/${voice}.bin`
}

// Supertonic TTS using Transformers.js pipeline (Supertonic-TTS-2-ONNX)
export class SupertonicTTS {
  pipeline: any
  result_audio: { text: string; audio: RawAudio }[] = []

  constructor(pipeline: any) {
    this.pipeline = pipeline
  }

  static get voices(): { id: string; name: string }[] {
    return VOICES.map((id) => ({ id, name: id }))
  }

  static async from_pretrained() {
    const { pipeline } = await import('@huggingface/transformers')
    const tts = await pipeline('text-to-speech', SUPERTONIC_MODEL)
    return new SupertonicTTS(tts)
  }

  async *stream(
    textStreamer: AsyncIterable<string>,
    options: { voice?: string; speed?: number; steps?: number } = {},
  ) {
    const voice = options.voice ?? 'M1'
    const speed = options.speed ?? 1.05
    const steps = options.steps ?? 5
    const speakerurl = VOICES.includes(voice as (typeof VOICES)[number])
      ? voiceembeddingurl(voice)
      : voiceembeddingurl('M1')

    for await (const text of textStreamer) {
      if (!text?.trim()) {
        continue
      }
      try {
        if (!this.pipeline) {
          yield { text, audio: new RawAudio(new Float32Array(0), SAMPLE_RATE) }
          continue
        }
        const wrapped = `<en>${text.trim()}</en>`
        const output = await this.pipeline(wrapped, {
          speaker_embeddings: speakerurl,
          num_inference_steps: steps,
          speed,
        })
        const audio =
          output?.audio instanceof Float32Array
            ? output.audio
            : (output?.audio?.audio ?? new Float32Array(0))
        const rate = output?.sampling_rate ?? SAMPLE_RATE
        const raw = new RawAudio(audio, rate)
        this.result_audio.push({ text, audio: raw })
        yield { text, audio: raw }
      } catch (err) {
        console.error('SupertonicTTS stream error:', err)
        yield {
          text,
          audio: new RawAudio(new Float32Array(SAMPLE_RATE), SAMPLE_RATE),
        }
      }
    }
  }

  merge_audio(): RawAudio | null {
    if (this.result_audio.length === 0) {
      return null
    }
    try {
      const rate = this.result_audio[0].audio.sampling_rate
      const length = this.result_audio.reduce(
        (sum, chunk) => sum + chunk.audio.length,
        0,
      )
      const waveform = new Float32Array(length)
      let offset = 0
      for (const { audio } of this.result_audio) {
        waveform.set(audio.audio, offset)
        offset += audio.length
      }
      normalizepeak(waveform, 0.9)
      const trimmed = trimsilence(waveform, 0.002, Math.floor(rate * 0.02))
      return new RawAudio(trimmed, rate)
    } catch (err) {
      console.error('SupertonicTTS merge_audio error:', err)
      return null
    }
  }

  clearAudio() {
    this.result_audio = []
  }

  async close() {
    if (this.pipeline?.dispose != null) {
      await this.pipeline.dispose?.()
    }
    this.pipeline = null
  }
}
