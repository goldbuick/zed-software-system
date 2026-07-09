import type { DEVICELIKE, TTS_VALIDATE_REPLY } from 'zss/device/messagetypes'
import { workerlogerror } from 'zss/device/messagetypes'
import {
  FISH_DEFAULT_MODEL,
  describefishconfig,
  maskfishapikey,
  normalizemodel,
  requestfishaudiobytes,
} from 'zss/feature/tts/fishaudio'
import { MAYBE, ispresent } from 'zss/mapping/types'

export const FISH_VOICE_HELP =
  'fish voice = reference_id from fish.audio (use as #tts <id> <phrase>)'
export const FISH_MODEL_HELP =
  'fish models: s2.1-pro-free (default), s2.1-pro, s2-pro, s1 — #ttsengine fish <key> [model]'

function effectivefishmodel(model: string): string {
  return normalizemodel(model.trim() ? model : FISH_DEFAULT_MODEL)
}

export function requestfishinfo(
  config: string,
  model: string,
  info: string,
): string[] | TTS_VALIDATE_REPLY {
  switch (info) {
    case 'voices':
      return [FISH_VOICE_HELP, FISH_MODEL_HELP]
    case 'status':
      return [
        `ttsengine fish model=${effectivefishmodel(model)}`,
        `api_key=${maskfishapikey(config)}`,
      ]
    case 'config': {
      const lines = [
        `ttsengine fish model=${effectivefishmodel(model)}`,
        `api_key=${maskfishapikey(config)}`,
      ]
      if (!config.trim()) {
        lines.push(
          'fish tts config: set api key with #ttsengine fish <key> [model]',
        )
        return lines
      }
      const result = describefishconfig(config, model)
      if (result.ok) {
        lines.push(...result.lines)
      } else {
        lines.push(`tts validate>> ${result.errormsg}`)
      }
      return lines
    }
    case 'validate': {
      const key = config.trim()
      if (!key) {
        return { ok: false, errormsg: 'api key is not set' }
      }
      const backend = effectivefishmodel(model)
      const result = describefishconfig(key, backend)
      if (!result.ok) {
        return { ok: false, errormsg: result.errormsg }
      }
      return { ok: true, model: backend }
    }
    default:
      return []
  }
}

export async function requestfishaudiobytesforworker(
  device: DEVICELIKE,
  player: string,
  apikey: string,
  referenceid: string,
  text: string,
  model: string,
): Promise<MAYBE<ArrayBuffer>> {
  const result = await requestfishaudiobytes(
    apikey,
    referenceid,
    text,
    model.trim() ? model : FISH_DEFAULT_MODEL,
  )
  if (!result.ok) {
    workerlogerror(device, player, 'fish tts', result.errormsg)
    return undefined
  }
  return ispresent(result.bytes) ? result.bytes : undefined
}
