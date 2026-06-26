import { workstatus } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/api'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { PiperTTS } from './pipertts'
import { SupertonicTTS } from './supertonictts'
import {
  requestfishaudiobytesforworker,
  requestfishinfo,
} from './ttsfish'
import { RawAudio, TextSplitterStream } from './utils'

let pipertts: MAYBE<PiperTTS>
let loadedpiperkey: string | undefined
const piperinflight = new Map<string, Promise<PiperTTS>>()

let supertonictts: MAYBE<SupertonicTTS>
let supertonicloadpromise: Promise<SupertonicTTS> | undefined

function piperkey(baseurl: string, jsonurl: string) {
  return `${baseurl}\0${jsonurl}`
}

async function ensurepiper(
  device: DEVICELIKE,
  player: string,
  baseurl: string,
  jsonurl: string,
): Promise<PiperTTS> {
  const key = piperkey(baseurl, jsonurl)
  if (ispresent(pipertts) && loadedpiperkey === key) {
    return pipertts
  }
  if (ispresent(pipertts) && loadedpiperkey !== key) {
    await pipertts.close()
    pipertts = undefined
    loadedpiperkey = undefined
  }
  if (!piperinflight.has(key)) {
    piperinflight.set(
      key,
      (async () => {
        try {
          workstatus(device, player, 'tts load')
          const p = await PiperTTS.from_pretrained(baseurl, jsonurl)
          pipertts = p
          loadedpiperkey = key
          return p
        } finally {
          piperinflight.delete(key)
        }
      })(),
    )
  }
  return piperinflight.get(key)!
}

async function ensuresupertonic(
  device: DEVICELIKE,
  player: string,
): Promise<SupertonicTTS> {
  if (ispresent(supertonictts)) {
    return supertonictts
  }
  supertonicloadpromise ??= (async () => {
    try {
      workstatus(device, player, 'tts load')
      const t = await SupertonicTTS.from_pretrained()
      supertonictts = t
      return t
    } finally {
      supertonicloadpromise = undefined
    }
  })()
  return supertonicloadpromise
}

function convertarraybytes(rawaudio: RawAudio) {
  return rawaudio.encodeWAV(rawaudio.audio, rawaudio.sampling_rate)
}

/** Piper config is a HuggingFace voice path, not an opaque token (e.g. fish api key). */
export function ispipervoicepath(config: string): boolean {
  const trimmed = config.trim()
  if (!trimmed) {
    return false
  }
  return trimmed.includes('/') || trimmed.endsWith('.onnx')
}

function piperconfigforworker(config: string): string {
  return ispipervoicepath(config) ? config.trim() : ''
}

function localttsconfiginfo(
  engine: 'piper' | 'supertonic',
  config: string,
): string[] {
  const effective =
    engine === 'piper' ? piperconfigforworker(config) : config.trim()
  if (effective) {
    return [`ttsengine ${engine} config=${effective}`]
  }
  return [
    `ttsengine ${engine}`,
    `set config with #ttsengine ${engine} <config>`,
  ]
}

function localpipervalidate(
  config: string,
  model: string,
): { ok: true; model: string } | { ok: false; errormsg: string } {
  if (!config.trim()) {
    return { ok: false, errormsg: 'config is not set' }
  }
  if (!ispipervoicepath(config)) {
    return {
      ok: false,
      errormsg:
        'config must be a piper voice path (e.g. en/en_US/.../voice.onnx)',
    }
  }
  return { ok: true, model: model.trim() }
}

function localsupertonicvalidate(
  config: string,
  model: string,
): { ok: true; model: string } | { ok: false; errormsg: string } {
  if (!config.trim()) {
    return { ok: false, errormsg: 'config is not set' }
  }
  return { ok: true, model: model.trim() }
}

export async function requestinfo(
  device: DEVICELIKE,
  player: string,
  engine: 'piper' | 'supertonic' | 'fish',
  info: string,
  config = '',
  model = '',
): Promise<any> {
  try {
    switch (engine) {
      case 'fish':
        return requestfishinfo(config, model, info)
      case 'supertonic':
        switch (info) {
          case 'voices':
            return SupertonicTTS.voices.map((v) => v.id)
          case 'config':
            return localttsconfiginfo('supertonic', config)
          case 'status':
            return localttsconfiginfo('supertonic', config)
          case 'validate':
            return localsupertonicvalidate(config, model)
          default:
            return []
        }
      case 'piper': {
        if (info === 'config' || info === 'status') {
          return localttsconfiginfo('piper', config)
        }
        if (info === 'validate') {
          return localpipervalidate(config, model)
        }
        const baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx`
        const jsonurl = `${baseurl}.json`
        await ensurepiper(device, player, baseurl, jsonurl)
        if (ispresent(pipertts)) {
          switch (info) {
            case 'voices':
              return [`numbers 0-${pipertts.voiceConfig.num_speakers - 1}`]
          }
        }
        return []
      }
      default:
        return []
    }
  } catch (err) {
    console.error('TTS requestinfo error:', err)
    return []
  }
}

const TTS_TIMEOUT_MS = 10000

export async function requestaudiobytes(
  device: DEVICELIKE,
  player: string,
  engine: 'piper' | 'supertonic' | 'fish',
  config: string,
  voice: string,
  input: string,
  model = '',
): Promise<MAYBE<ArrayBuffer>> {
  try {
    switch (engine) {
      case 'fish':
        return requestfishaudiobytesforworker(
          device,
          player,
          config,
          voice,
          input,
          model,
        )
      case 'supertonic': {
        await ensuresupertonic(device, player)
        if (!ispresent(supertonictts) || !supertonictts.pipeline) {
          return undefined
        }
        workstatus(device, player, 'tts work')
        let timeoutid: ReturnType<typeof setTimeout> | null = null
        const cleartimeout = () => {
          if (timeoutid != null) {
            clearTimeout(timeoutid)
            timeoutid = null
          }
        }
        const supertonicvoice =
          { '0': 'M1', '1': 'M2', '2': 'F1', '3': 'F2' }[voice] ?? voice
        const synth = async (): Promise<MAYBE<ArrayBuffer>> => {
          try {
            const streamer = new TextSplitterStream()
            streamer.push(input)
            streamer.close()
            const stream = supertonictts!.stream(
              streamer as AsyncIterable<string>,
              { voice: supertonicvoice },
            )
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _ of stream) {
              workstatus(device, player, 'tts read')
            }
            const rawaudio = supertonictts?.merge_audio()
            supertonictts?.clearAudio()
            if (ispresent(rawaudio)) {
              workstatus(device, player, 'tts done')
              return convertarraybytes(rawaudio)
            }
            return undefined
          } finally {
            cleartimeout()
          }
        }
        const timeoutp = new Promise<undefined>((resolve) => {
          timeoutid = setTimeout(() => {
            cleartimeout()
            supertonictts?.clearAudio()
            resolve(undefined)
          }, TTS_TIMEOUT_MS)
        })
        return await Promise.race([synth(), timeoutp])
      }
      case 'piper': {
        let baseurl: string
        const voicepath = piperconfigforworker(config)
        if (voicepath) {
          baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${voicepath}`
        } else {
          baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx`
        }
        const jsonurl = `${baseurl}.json`
        await ensurepiper(device, player, baseurl, jsonurl)
        if (!ispresent(pipertts)) {
          return undefined
        }
        workstatus(device, player, 'tts work')
        let timeoutid: ReturnType<typeof setTimeout> | null = null
        const cleartimeout = () => {
          if (timeoutid != null) {
            clearTimeout(timeoutid)
            timeoutid = null
          }
        }
        const synth = async (): Promise<MAYBE<ArrayBuffer>> => {
          try {
            const streamer = new TextSplitterStream()
            streamer.push(input)
            streamer.close()
            const stream = pipertts!.stream(streamer, {
              speakerId: parseFloat(voice),
            })
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _ of stream) {
              workstatus(device, player, 'tts read')
            }
            const rawaudio = pipertts?.merge_audio()
            pipertts?.clearAudio()
            workstatus(device, player, 'tts done')
            return ispresent(rawaudio) ? convertarraybytes(rawaudio) : undefined
          } finally {
            cleartimeout()
          }
        }
        const timeoutp = new Promise<undefined>((resolve) => {
          timeoutid = setTimeout(() => {
            cleartimeout()
            pipertts?.clearAudio()
            resolve(undefined)
          }, TTS_TIMEOUT_MS)
        })
        return await Promise.race([synth(), timeoutp])
      }
      default:
        return undefined
    }
  } catch (err) {
    console.error('TTS requestaudiobytes error:', err)
    return undefined
  }
}
