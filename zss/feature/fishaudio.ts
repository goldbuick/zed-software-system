import { FishAudioClient, FishAudioError } from 'fish-audio'
import { brickproxiedurl } from 'zss/feature/url'

/** Fish API origin; SDK appends resource paths (v1/tts, …). */
export const FISH_API_ORIGIN = 'https://api.fish.audio'

/** Upstream Fish TTS endpoint (reference only). */
export const FISH_TTS_UPSTREAM = `${FISH_API_ORIGIN}/v1/tts`

/** brick.zed.cafe CORS proxy — same pattern as Museum of ZZT fetches. */
export const FISH_API_BASE = brickproxiedurl(FISH_API_ORIGIN)

/** Default Fish model (S2.1 Pro — matches fish.audio web app). */
export const FISH_DEFAULT_MODEL = 's2.1-pro'

const FISH_MODEL_ALIASES: Record<string, string> = {
  's2.1-pro': 's2.1-pro',
  's2-1-pro': 's2.1-pro',
  s21pro: 's2.1-pro',
  's2.1-pro-free': 's2.1-pro-free',
  's2-pro-free': 's2.1-pro-free',
  's2-pro': 's2-pro',
  s2pro: 's2-pro',
  s1: 's1',
  's1-mini': 's1-mini',
}

export const FISH_KNOWN_MODELS = [
  's2.1-pro',
  's2.1-pro-free',
  's2-pro',
  's1',
  's1-mini',
] as const

export function maskfishapikey(key: string): string {
  const trimmed = key.trim()
  if (trimmed.length === 0) {
    return '(not set)'
  }
  if (trimmed.length <= 8) {
    return '***'
  }
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`
}

export function isknownfishmodel(model: string): boolean {
  const normalized = normalizemodel(model)
  return (FISH_KNOWN_MODELS as readonly string[]).includes(normalized)
}

export function normalizemodel(raw: string): string {
  const key = raw.trim().toLowerCase()
  return FISH_MODEL_ALIASES[key] ?? raw.trim()
}

export type FISH_CONFIG_VALIDATE_RESULT =
  | { ok: true; lines: string[] }
  | { ok: false; errormsg: string }

function createfishclient(apikey: string) {
  return new FishAudioClient({
    apiKey: apikey,
    baseUrl: FISH_API_BASE,
  })
}

export function describefishconfig(
  apikey: string,
  model: string,
): FISH_CONFIG_VALIDATE_RESULT {
  const key = String(apikey).trim()
  const backend = normalizemodel(model.trim() ? model : FISH_DEFAULT_MODEL)
  if (!key) {
    return { ok: false, errormsg: 'api key is not set' }
  }
  const lines = [
    `fish tts config: model=${backend} api_key=${maskfishapikey(key)}`,
  ]
  if (model.trim() !== '' && !isknownfishmodel(model)) {
    lines.push(
      `fish tts config: unknown model alias "${model.trim()}" — using ${backend}`,
    )
  }
  return { ok: true, lines }
}

export type FISH_TTS_REQUEST_PAYLOAD = {
  endpoint: string
  model: string
  reference_id: string
  text: string
  format: 'mp3'
}

export function buildfishttsrequestpayload(
  referenceid: string | number,
  text: string | number,
  model?: string,
): FISH_TTS_REQUEST_PAYLOAD {
  return {
    endpoint: FISH_TTS_UPSTREAM,
    model: normalizemodel(model?.trim() ? model : FISH_DEFAULT_MODEL),
    reference_id: String(referenceid).trim(),
    text: String(text).trim(),
    format: 'mp3',
  }
}

export function formatfishttsrequestlines(
  payload: FISH_TTS_REQUEST_PAYLOAD,
  apikey: string,
): string[] {
  const preview =
    payload.text.length > 80
      ? `${payload.text.slice(0, 80)}… (${payload.text.length} chars)`
      : payload.text
  return [
    `fish tts request>> POST ${payload.endpoint}`,
    `fish tts request>> header model: ${payload.model}`,
    `fish tts request>> header authorization: Bearer ${maskfishapikey(apikey)}`,
    `fish tts request>> body reference_id: ${payload.reference_id}`,
    `fish tts request>> body text: ${preview}`,
    `fish tts request>> body format: ${payload.format}`,
  ]
}

export type FISH_TTS_RESULT =
  | { ok: true; bytes: ArrayBuffer }
  | { ok: false; errormsg: string }

function formatfisherror(err: FishAudioError): string {
  const body = err.body
  if (body && typeof body === 'object' && body !== null && 'message' in body) {
    const msg = (body as { message: unknown }).message
    if (typeof msg === 'string' && msg.trim() !== '') {
      if (err.statusCode === 402) {
        return `${msg} — fish.audio/app/developers`
      }
      return msg
    }
  }
  if (err.statusCode === 402) {
    return 'Insufficient API credit — add funds at fish.audio/app/developers'
  }
  if (err.message.trim() !== '') {
    return err.message
  }
  return `Fish TTS failed (status ${err.statusCode ?? 'unknown'})`
}

async function readablestreamtoarraybuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<ArrayBuffer> {
  return new Response(stream).arrayBuffer()
}

export async function requestfishaudiobytes(
  apikey: string | number,
  referenceid: string | number,
  text: string | number,
  model?: string,
): Promise<FISH_TTS_RESULT> {
  const key = String(apikey).trim()
  const voice = String(referenceid).trim()
  const phrase = String(text).trim()
  if (!key || !voice || !phrase) {
    return {
      ok: false,
      errormsg: 'missing api key, voice reference_id, or text',
    }
  }
  const payload = buildfishttsrequestpayload(voice, phrase, model)
  try {
    const client = createfishclient(key)
    const stream = await client.textToSpeech.convert(
      {
        text: payload.text,
        reference_id: payload.reference_id,
        format: payload.format,
      },
      payload.model as 's1',
    )
    const bytes = await readablestreamtoarraybuffer(stream)
    return { ok: true, bytes }
  } catch (err) {
    if (err instanceof FishAudioError) {
      return { ok: false, errormsg: formatfisherror(err) }
    }
    return {
      ok: false,
      errormsg: err instanceof Error ? err.message : String(err),
    }
  }
}
