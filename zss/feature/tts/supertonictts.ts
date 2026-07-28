import { InferenceSession, Tensor, env } from 'onnxruntime-web'

import { cachedfetch } from './modelcache'
import { RawAudio, normalizepeak, trimsilence } from './utils'

const SUPERTONIC_BASE =
  'https://huggingface.co/Supertone/supertonic-3/resolve/main'
const VOICES = [
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
] as const
const DEFAULT_LANG = 'en'
const DEFAULT_SPEED = 1.05
const DEFAULT_STEPS = 8
const SAMPLE_RATE = 44100
const AVAILABLE_LANGS = new Set([
  'en',
  'ko',
  'ja',
  'ar',
  'bg',
  'cs',
  'da',
  'de',
  'el',
  'es',
  'et',
  'fi',
  'fr',
  'hi',
  'hr',
  'hu',
  'id',
  'it',
  'lt',
  'lv',
  'nl',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'sl',
  'sv',
  'tr',
  'uk',
  'vi',
  'na',
])

type VOICE_ID = (typeof VOICES)[number]

type TTS_CFGS = {
  ae: { sample_rate: number; base_chunk_size: number }
  ttl: { chunk_compress_factor: number; latent_dim: number }
}

type VOICE_STYLE_JSON = {
  style_ttl: { dims: number[]; data: number[][][] | number[] }
  style_dp: { dims: number[]; data: number[][][] | number[] }
}

type STYLE_TENSORS = {
  ttl: Tensor
  dp: Tensor
}

/** Standalone ArrayBuffer for ORT WASM (avoids detached views from cached Response). */
function copytoarraybuffer(data: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(data.byteLength)
  out.set(data)
  return out.buffer
}

function flattennumbers(data: unknown): number[] {
  if (!Array.isArray(data)) {
    return []
  }
  const out: number[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const child of node) {
        walk(child)
      }
      return
    }
    out.push(Number(node))
  }
  walk(data)
  return out
}

function voicestyleurl(voice: string) {
  return `${SUPERTONIC_BASE}/voice_styles/${voice}.json`
}

function onnxurl(name: string) {
  return `${SUPERTONIC_BASE}/onnx/${name}`
}

function lengthtomask(lengths: number[], maxlen?: number): number[][][] {
  const actual = maxlen ?? Math.max(...lengths)
  return lengths.map((len) => {
    const row = new Array(actual).fill(0)
    for (let j = 0; j < Math.min(len, actual); j++) {
      row[j] = 1
    }
    return [row]
  })
}

function chunktext(text: string, maxlen = 300): string[] {
  const paragraphs = text
    .trim()
    .split(/\n\s*\n+/)
    .filter((p) => p.trim())
  const chunks: string[] = []
  for (let paragraph of paragraphs) {
    paragraph = paragraph.trim()
    if (!paragraph) {
      continue
    }
    const sentences = paragraph.split(
      /(?<=[.!?])\s+(?=[A-Z0-9"'])|(?<=[。！？])/,
    )
    let current = ''
    for (const sentence of sentences) {
      const next = current ? `${current} ${sentence}` : sentence
      if (next.length <= maxlen) {
        current = next
      } else {
        if (current) {
          chunks.push(current)
        }
        if (sentence.length <= maxlen) {
          current = sentence
        } else {
          for (let i = 0; i < sentence.length; i += maxlen) {
            chunks.push(sentence.slice(i, i + maxlen))
          }
          current = ''
        }
      }
    }
    if (current) {
      chunks.push(current)
    }
  }
  return chunks.length > 0 ? chunks : [text.trim()]
}

class UnicodeProcessor {
  indexer: number[]

  constructor(indexer: number[]) {
    this.indexer = indexer
  }

  preprocesstext(text: string, lang: string): string {
    let out = text.normalize('NFKD')
    out = out.replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu,
      '',
    )
    const replacements: Record<string, string> = {
      '\u2013': '-',
      '\u2011': '-',
      '\u2014': '-',
      _: ' ',
      '\u201C': '"',
      '\u201D': '"',
      '\u2018': "'",
      '\u2019': "'",
      '\u00B4': "'",
      '`': "'",
      '[': ' ',
      ']': ' ',
      '|': ' ',
      '/': ' ',
      '#': ' ',
      '\u2192': ' ',
      '\u2190': ' ',
    }
    for (const [k, v] of Object.entries(replacements)) {
      out = out.replaceAll(k, v)
    }
    out = out.replace(/[\u2665\u2606\u2661\u00A9\\]/g, '')
    out = out.replaceAll('@', ' at ')
    out = out.replaceAll('e.g.,', 'for example, ')
    out = out.replaceAll('i.e.,', 'that is, ')
    out = out.replace(/ ,/g, ',')
    out = out.replace(/ \./g, '.')
    out = out.replace(/ !/g, '!')
    out = out.replace(/ \?/g, '?')
    out = out.replace(/ ;/g, ';')
    out = out.replace(/ :/g, ':')
    out = out.replace(/ '/g, "'")
    while (out.includes('""')) {
      out = out.replace('""', '"')
    }
    while (out.includes("''")) {
      out = out.replace("''", "'")
    }
    while (out.includes('``')) {
      out = out.replace('``', '`')
    }
    out = out.replace(/\s+/g, ' ').trim()
    if (
      !/[.!?;:,'"')\]}\u2026\u3002\u300d\u300f\u3011\u3009\u300b\u203a\u00bb]$/.test(
        out,
      )
    ) {
      out += '.'
    }
    if (!AVAILABLE_LANGS.has(lang)) {
      throw new Error(`Invalid language: ${lang}`)
    }
    return `<${lang}>${out}</${lang}>`
  }

  call(
    textlist: string[],
    langlist: string[],
  ): { textids: number[][]; textmask: number[][][] } {
    const processed = textlist.map((t, i) =>
      this.preprocesstext(t, langlist[i]),
    )
    const lengths = processed.map((t) => t.length)
    const maxlen = Math.max(...lengths)
    const textids = processed.map((text) => {
      const row = new Array(maxlen).fill(0)
      for (let j = 0; j < text.length; j++) {
        const codepoint = text.codePointAt(j) ?? 0
        row[j] = codepoint < this.indexer.length ? this.indexer[codepoint] : -1
      }
      return row
    })
    return { textids, textmask: lengthtomask(lengths, maxlen) }
  }
}

function samplenoisylatent(
  duration: number[],
  samplerate: number,
  basechunksize: number,
  chunkcompress: number,
  latentdim: number,
): { xt: number[][][]; latentmask: number[][][] } {
  const bsz = duration.length
  const maxdur = Math.max(...duration)
  const wavlenmax = Math.floor(maxdur * samplerate)
  const wavlengths = duration.map((d) => Math.floor(d * samplerate))
  const chunksize = basechunksize * chunkcompress
  const latentlen = Math.floor((wavlenmax + chunksize - 1) / chunksize)
  const latentdimval = latentdim * chunkcompress
  const xt: number[][][] = []
  for (let b = 0; b < bsz; b++) {
    const batch: number[][] = []
    for (let d = 0; d < latentdimval; d++) {
      const row: number[] = []
      for (let t = 0; t < latentlen; t++) {
        const u1 = Math.max(0.0001, Math.random())
        const u2 = Math.random()
        row.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2))
      }
      batch.push(row)
    }
    xt.push(batch)
  }
  const latentlengths = wavlengths.map((len) =>
    Math.floor((len + chunksize - 1) / chunksize),
  )
  const latentmask = lengthtomask(latentlengths, latentlen)
  for (let b = 0; b < bsz; b++) {
    for (let d = 0; d < latentdimval; d++) {
      for (let t = 0; t < latentlen; t++) {
        xt[b][d][t] *= latentmask[b][0][t]
      }
    }
  }
  return { xt, latentmask }
}

async function loadonnxsessions(path: string): Promise<InferenceSession> {
  const response = await cachedfetch(path)
  const bytes = await response.bytes()
  const buffer = copytoarraybuffer(bytes)
  return InferenceSession.create(buffer, {
    executionProviders: [{ name: 'wasm' }, 'cuda', 'cpu'],
  })
}

async function loadvoicestyle(voice: string): Promise<STYLE_TENSORS> {
  const response = await cachedfetch(voicestyleurl(voice))
  const style = (await response.json()) as VOICE_STYLE_JSON
  const ttldims = style.style_ttl.dims
  const dpdims = style.style_dp.dims
  const ttlflat = Float32Array.from(flattennumbers(style.style_ttl.data))
  const dpflat = Float32Array.from(flattennumbers(style.style_dp.data))
  return {
    ttl: new Tensor('float32', ttlflat, [1, ttldims[1], ttldims[2]]),
    dp: new Tensor('float32', dpflat, [1, dpdims[1], dpdims[2]]),
  }
}

// Supertonic 3 TTS via onnxruntime-web (Supertone/supertonic-3)
export class SupertonicTTS {
  ready = false
  result_audio: { text: string; audio: RawAudio }[] = []
  cfgs: TTS_CFGS | null = null
  textprocessor: UnicodeProcessor | null = null
  dport: InferenceSession | null = null
  textencort: InferenceSession | null = null
  vectorestort: InferenceSession | null = null
  vocoderort: InferenceSession | null = null
  voicestylecache = new Map<string, STYLE_TENSORS>()

  static get voices(): { id: string; name: string }[] {
    return VOICES.map((id) => ({ id, name: id }))
  }

  static async from_pretrained() {
    env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/'

    const [cfgsres, indexerres, dport, textencort, vectorestort, vocoderort] =
      await Promise.all([
        cachedfetch(onnxurl('tts.json')),
        cachedfetch(onnxurl('unicode_indexer.json')),
        loadonnxsessions(onnxurl('duration_predictor.onnx')),
        loadonnxsessions(onnxurl('text_encoder.onnx')),
        loadonnxsessions(onnxurl('vector_estimator.onnx')),
        loadonnxsessions(onnxurl('vocoder.onnx')),
      ])

    const cfgs = (await cfgsres.json()) as TTS_CFGS
    const indexer = (await indexerres.json()) as number[]
    const tts = new SupertonicTTS()
    tts.cfgs = cfgs
    tts.textprocessor = new UnicodeProcessor(indexer)
    tts.dport = dport
    tts.textencort = textencort
    tts.vectorestort = vectorestort
    tts.vocoderort = vocoderort
    tts.ready = true
    return tts
  }

  async ensurevoicestyle(voice: string): Promise<STYLE_TENSORS> {
    const id = VOICES.includes(voice as VOICE_ID) ? voice : 'M1'
    const cached = this.voicestylecache.get(id)
    if (cached) {
      return cached
    }
    const style = await loadvoicestyle(id)
    this.voicestylecache.set(id, style)
    return style
  }

  async synthesizechunk(
    text: string,
    lang: string,
    style: STYLE_TENSORS,
    steps: number,
    speed: number,
  ): Promise<Float32Array> {
    if (
      !this.cfgs ||
      !this.textprocessor ||
      !this.dport ||
      !this.textencort ||
      !this.vectorestort ||
      !this.vocoderort
    ) {
      return new Float32Array(0)
    }

    const bsz = 1
    const { textids, textmask } = this.textprocessor.call([text], [lang])
    const textidsflat = BigInt64Array.from(textids.flat().map((x) => BigInt(x)))
    const textidstensor = new Tensor('int64', textidsflat, [
      bsz,
      textids[0].length,
    ])
    const textmaskflat = Float32Array.from(textmask.flat(2))
    const textmasktensor = new Tensor('float32', textmaskflat, [
      bsz,
      1,
      textmask[0][0].length,
    ])

    const dpout = await this.dport.run({
      text_ids: textidstensor,
      style_dp: style.dp,
      text_mask: textmasktensor,
    })
    const duration = Array.from(dpout.duration.data as Float32Array)
    for (let i = 0; i < duration.length; i++) {
      duration[i] /= speed
    }

    const textencout = await this.textencort.run({
      text_ids: textidstensor,
      style_ttl: style.ttl,
      text_mask: textmasktensor,
    })
    const textemb = textencout.text_emb

    const sampled = samplenoisylatent(
      duration,
      this.cfgs.ae.sample_rate,
      this.cfgs.ae.base_chunk_size,
      this.cfgs.ttl.chunk_compress_factor,
      this.cfgs.ttl.latent_dim,
    )
    let xt = sampled.xt
    const { latentmask } = sampled
    const latentmasktensor = new Tensor(
      'float32',
      Float32Array.from(latentmask.flat(2)),
      [bsz, 1, latentmask[0][0].length],
    )
    const totalsteptensor = new Tensor('float32', Float32Array.from([steps]), [
      bsz,
    ])

    for (let step = 0; step < steps; step++) {
      const currentsteptensor = new Tensor(
        'float32',
        Float32Array.from([step]),
        [bsz],
      )
      const xttensor = new Tensor('float32', Float32Array.from(xt.flat(2)), [
        bsz,
        xt[0].length,
        xt[0][0].length,
      ])
      const vectout = await this.vectorestort.run({
        noisy_latent: xttensor,
        text_emb: textemb,
        style_ttl: style.ttl,
        latent_mask: latentmasktensor,
        text_mask: textmasktensor,
        current_step: currentsteptensor,
        total_step: totalsteptensor,
      })
      const denoised = Array.from(vectout.denoised_latent.data as Float32Array)
      const latentdim = xt[0].length
      const latentlen = xt[0][0].length
      const next: number[][][] = []
      let idx = 0
      for (let b = 0; b < bsz; b++) {
        const batch: number[][] = []
        for (let d = 0; d < latentdim; d++) {
          const row: number[] = []
          for (let t = 0; t < latentlen; t++) {
            row.push(denoised[idx++])
          }
          batch.push(row)
        }
        next.push(batch)
      }
      xt = next
    }

    const vocoderout = await this.vocoderort.run({
      latent: new Tensor('float32', Float32Array.from(xt.flat(2)), [
        bsz,
        xt[0].length,
        xt[0][0].length,
      ]),
    })
    return Float32Array.from(vocoderout.wav_tts.data as Float32Array)
  }

  async synthesize(
    text: string,
    options: {
      voice?: string
      speed?: number
      steps?: number
      lang?: string
    } = {},
  ): Promise<RawAudio> {
    const voice = options.voice ?? 'M1'
    const speed = options.speed ?? DEFAULT_SPEED
    const steps = options.steps ?? DEFAULT_STEPS
    const lang = options.lang ?? DEFAULT_LANG
    const style = await this.ensurevoicestyle(voice)
    const maxlen = lang === 'ko' || lang === 'ja' ? 120 : 300
    const parts = chunktext(text, maxlen)
    const rate = this.cfgs?.ae.sample_rate ?? SAMPLE_RATE
    const silence = new Float32Array(Math.floor(0.3 * rate))
    const waves: Float32Array[] = []
    for (let i = 0; i < parts.length; i++) {
      const wav = await this.synthesizechunk(
        parts[i],
        lang,
        style,
        steps,
        speed,
      )
      if (i > 0) {
        waves.push(silence)
      }
      waves.push(wav)
    }
    let total = 0
    for (const w of waves) {
      total += w.length
    }
    const merged = new Float32Array(total)
    let offset = 0
    for (const w of waves) {
      merged.set(w, offset)
      offset += w.length
    }
    return new RawAudio(merged, rate)
  }

  async *stream(
    textStreamer: AsyncIterable<string>,
    options: {
      voice?: string
      speed?: number
      steps?: number
      lang?: string
    } = {},
  ) {
    const rate = this.cfgs?.ae.sample_rate ?? SAMPLE_RATE
    for await (const text of textStreamer) {
      if (!text?.trim()) {
        continue
      }
      try {
        if (!this.ready) {
          yield { text, audio: new RawAudio(new Float32Array(0), rate) }
          continue
        }
        const raw = await this.synthesize(text.trim(), options)
        this.result_audio.push({ text, audio: raw })
        yield { text, audio: raw }
      } catch (err) {
        console.error('SupertonicTTS stream error:', err)
        yield {
          text,
          audio: new RawAudio(new Float32Array(rate), rate),
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
    const sessions = [
      this.dport,
      this.textencort,
      this.vectorestort,
      this.vocoderort,
    ]
    for (const session of sessions) {
      if (session?.release) {
        await session.release()
      }
    }
    this.dport = null
    this.textencort = null
    this.vectorestort = null
    this.vocoderort = null
    this.textprocessor = null
    this.cfgs = null
    this.voicestylecache.clear()
    this.ready = false
  }
}
