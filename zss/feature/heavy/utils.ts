/// <reference types="@webgpu/types" />
import { chunkText, cleanTextForTTS } from './textcleaner'

export async function detectWebGPU() {
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return !!adapter
  } catch {
    return false
  }
}

// Text splitting stream to break text into chunks
export class TextSplitterStream {
  chunks: string[]
  closed: boolean
  constructor() {
    this.chunks = []
    this.closed = false
  }

  chunkText(text: string) {
    // Clean the text first, then chunk it
    const cleanedText = cleanTextForTTS(text)
    return chunkText(cleanedText)
  }

  push(text: string) {
    // Simple sentence splitting for now
    const sentences = this.chunkText(text) ?? [text]
    this.chunks.push(...sentences)
  }

  close() {
    this.closed = true
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *[Symbol.asyncIterator]() {
    for (const chunk of this.chunks) {
      yield chunk
    }
  }
}

// RawAudio class to handle audio data
export class RawAudio {
  audio: any
  sampling_rate: any
  constructor(audio: any, sampling_rate: any) {
    this.audio = audio
    this.sampling_rate = sampling_rate
  }

  get length() {
    return this.audio.length
  }

  toBlob() {
    // Convert Float32Array to WAV blob
    const buffer = this.encodeWAV(this.audio, this.sampling_rate)
    return new Blob([buffer], { type: 'audio/wav' })
  }

  encodeWAV(samples: string | any[], sampleRate: number) {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    // RIFF identifier
    this.writeString(view, 0, 'RIFF')
    // file length
    view.setUint32(4, 36 + samples.length * 2, true)
    // RIFF type
    this.writeString(view, 8, 'WAVE')
    // format chunk identifier
    this.writeString(view, 12, 'fmt ')
    // format chunk length
    view.setUint32(16, 16, true)
    // sample format (raw)
    view.setUint16(20, 1, true)
    // channel count
    view.setUint16(22, 1, true)
    // sample rate
    view.setUint32(24, sampleRate, true)
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true)
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true)
    // bits per sample
    view.setUint16(34, 16, true)
    // data chunk identifier
    this.writeString(view, 36, 'data')
    // data chunk length
    view.setUint32(40, samples.length * 2, true)

    this.floatTo16BitPCM(view, 44, samples)

    return buffer
  }

  writeString(view: DataView<ArrayBuffer>, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  floatTo16BitPCM(
    output: DataView<ArrayBuffer>,
    offset: number,
    input: string | any[],
  ) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]))
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
  }
}

export function normalizePeak(f32: Float32Array<ArrayBuffer>, target = 0.9) {
  if (!f32?.length) return
  let max = 1e-9
  for (let i = 0; i < f32.length; i++) max = Math.max(max, Math.abs(f32[i]))
  const g = Math.min(4, target / max)
  if (g < 1) {
    for (let i = 0; i < f32.length; i++) f32[i] *= g
  }
}

export function trimSilence(
  f32: Float32Array<ArrayBuffer>,
  thresh = 0.002,
  minSamples = 480,
) {
  let s = 0,
    e = f32.length - 1
  while (s < e && Math.abs(f32[s]) < thresh) s++
  while (e > s && Math.abs(f32[e]) < thresh) e--
  s = Math.max(0, s - minSamples)
  e = Math.min(f32.length, e + minSamples)
  return f32.slice(s, e)
}
