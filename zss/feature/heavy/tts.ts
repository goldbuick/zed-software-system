import { apitoast } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/api'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { PiperTTS } from './pipertts'
import { SupertonicTTS } from './supertonictts'
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
          apitoast(device, player, 'piper loading...')
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
      apitoast(device, player, 'supertonic loading...')
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

export async function requestinfo(
  device: DEVICELIKE,
  player: string,
  engine: 'piper' | 'supertonic',
  info: string,
): Promise<any> {
  try {
    switch (engine) {
      case 'supertonic':
        if (info === 'voices') {
          return SupertonicTTS.voices.map((v) => v.id)
        }
        return []
      case 'piper': {
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
  engine: 'piper' | 'supertonic',
  config: string,
  voice: string,
  input: string,
): Promise<MAYBE<ArrayBuffer>> {
  try {
    switch (engine) {
      case 'supertonic': {
        await ensuresupertonic(device, player)
        if (!ispresent(supertonictts) || !supertonictts.pipeline) {
          return undefined
        }
        apitoast(device, player, 'supertonic working...')
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

            for await (const _ of stream) {
              apitoast(device, player, 'supertonic reading...')
            }
            const rawaudio = supertonictts?.merge_audio()
            supertonictts?.clearAudio()
            if (ispresent(rawaudio)) {
              apitoast(device, player, 'supertonic done...')
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
        if (config) {
          baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${config}`
        } else {
          baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx`
        }
        const jsonurl = `${baseurl}.json`
        await ensurepiper(device, player, baseurl, jsonurl)
        if (!ispresent(pipertts)) {
          return undefined
        }
        apitoast(device, player, `${engine} working...`)
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

            for await (const _ of stream) {
              apitoast(device, player, `${engine} reading...`)
            }
            const rawaudio = pipertts?.merge_audio()
            pipertts?.clearAudio()
            apitoast(device, player, `${engine} done...`)
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
