import { encode } from '@msgpack/msgpack'
import { brickproxiedurl } from 'zss/feature/brickurl'

/** Fish API origin (upstream). */
export const FISH_API_ORIGIN = 'https://api.fish.audio'

/** Upstream Fish TTS HTTP endpoint. */
export const FISH_TTS_UPSTREAM = `${FISH_API_ORIGIN}/v1/tts`

/**
 * brick encodes the full upstream URL in `?brick=` — not a reusable SDK baseUrl.
 * Museum of ZZT uses the same pattern: {@link brickproxiedurl} per request target.
 */
export const FISH_TTS_BRICK_URL = brickproxiedurl(FISH_TTS_UPSTREAM)

/** Default Fish model when #ttsengine fish omits the model arg. */
export const FISH_DEFAULT_MODEL = 's2.1-pro-free'

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
  brickurl: string
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
    brickurl: FISH_TTS_BRICK_URL,
    model: normalizemodel(model?.trim() ? model : FISH_DEFAULT_MODEL),
    reference_id: String(referenceid).trim(),
    text: String(text).trim(),
    format: 'mp3',
  }
}

export type FISH_TTS_RESULT =
  | { ok: true; bytes: ArrayBuffer }
  | { ok: false; errormsg: string }

async function parsefishhttperror(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string }
    if (typeof body.message === 'string' && body.message.trim() !== '') {
      if (response.status === 402) {
        return `${body.message} — fish.audio/app/developers`
      }
      return body.message
    }
  } catch {
    //
  }
  if (response.status === 402) {
    return 'Insufficient API credit — add funds at fish.audio/app/developers'
  }
  return `Fish TTS failed (status ${response.status})`
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
  const bodybytes = encode({
    text: payload.text,
    reference_id: payload.reference_id,
    format: payload.format,
  })
  try {
    const response = await fetch(payload.brickurl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        model: payload.model,
        'Content-Type': 'application/msgpack',
      },
      body: new Uint8Array(bodybytes),
    })
    if (!response.ok) {
      return { ok: false, errormsg: await parsefishhttperror(response) }
    }
    const bytes = await response.arrayBuffer()
    return { ok: true, bytes }
  } catch (err) {
    return {
      ok: false,
      errormsg: err instanceof Error ? err.message : String(err),
    }
  }
}
