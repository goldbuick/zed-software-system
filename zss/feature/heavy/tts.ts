import { apitoast } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/api'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { PiperTTS } from './pipertts'
import { SupertonicTTS } from './supertonictts'
import { RawAudio, TextSplitterStream } from './utils'

// yap instances
let pipertts: MAYBE<PiperTTS>
let supertonictts: MAYBE<SupertonicTTS>

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
      case 'piper':
        if (!ispresent(pipertts)) {
          apitoast(device, player, `${engine} loading...`)
          const baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx`
          pipertts = await PiperTTS.from_pretrained(
            baseurl,
            `${baseurl}.json`,
          )
        }
        if (ispresent(pipertts)) {
          switch (info) {
            case 'voices':
              return [`numbers 0-${pipertts.voiceConfig.num_speakers - 1}`]
          }
        }
        return []
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
        if (!ispresent(supertonictts)) {
          apitoast(device, player, 'supertonic loading...')
          supertonictts = await SupertonicTTS.from_pretrained()
        }
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        if (!ispresent(pipertts)) {
          apitoast(device, player, `${engine} loading...`)
          if (config) {
            const baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${config}`
            pipertts = await PiperTTS.from_pretrained(
              baseurl,
              `${baseurl}.json`,
            )
          } else {
            const baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx`
            pipertts = await PiperTTS.from_pretrained(
              baseurl,
              `${baseurl}.json`,
            )
          }
        }
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
