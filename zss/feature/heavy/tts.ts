import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { doasync } from 'zss/mapping/func'
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

export function requestinfo(
  player: string,
  engine: 'piper' | 'supertonic',
  info: string,
): Promise<any> {
  return new Promise((resolve) => {
    doasync(SOFTWARE, player, async () => {
      try {
        switch (engine) {
          case 'supertonic':
            if (info === 'voices') {
              resolve(SupertonicTTS.voices.map((v) => v.id))
            } else {
              resolve([])
            }
            return
          case 'piper':
            if (!ispresent(pipertts)) {
              write(SOFTWARE, player, `${engine} loading...`)
              const baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx`
              pipertts = await PiperTTS.from_pretrained(
                baseurl,
                `${baseurl}.json`,
              )
            }
            if (ispresent(pipertts)) {
              switch (info) {
                case 'voices':
                  resolve([
                    `numbers 0-${pipertts.voiceConfig.num_speakers - 1}`,
                  ])
                  return
              }
            }
            resolve([])
            return
          default:
            resolve([])
            return
        }
      } catch (err) {
        console.error('TTS requestinfo error:', err)
        resolve([])
      }
    })
  })
}

export function requestaudiobytes(
  player: string,
  engine: 'piper' | 'supertonic',
  config: string,
  voice: string,
  input: string,
): Promise<MAYBE<ArrayBuffer>> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const cleartimer = () => {
      if (timer != null) {
        clearTimeout(timer)
        timer = null
      }
    }
    doasync(SOFTWARE, player, async () => {
      try {
        switch (engine) {
          case 'supertonic': {
            if (!ispresent(supertonictts)) {
              write(SOFTWARE, player, 'supertonic loading...')
              supertonictts = await SupertonicTTS.from_pretrained()
            }
            if (!ispresent(supertonictts) || !supertonictts.pipeline) {
              resolve(undefined)
              return
            }
            write(SOFTWARE, player, 'supertonic working...')
            timer = setTimeout(() => {
              cleartimer()
              supertonictts?.clearAudio()
              resolve(undefined)
            }, 10000)
            // map numeric voice (0–3) to Supertonic names M1,M2,F1,F2
            const supertonicvoice =
              { '0': 'M1', '1': 'M2', '2': 'F1', '3': 'F2' }[voice] ?? voice
            const streamer = new TextSplitterStream()
            streamer.push(input)
            streamer.close()
            const stream = supertonictts.stream(
              streamer as AsyncIterable<string>,
              { voice: supertonicvoice },
            )
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _ of stream) {
              write(SOFTWARE, player, 'supertonic reading...')
            }
            const rawaudio = supertonictts?.merge_audio()
            cleartimer()
            supertonictts?.clearAudio()
            if (ispresent(rawaudio)) {
              write(SOFTWARE, player, 'supertonic done...')
              resolve(convertarraybytes(rawaudio))
            } else {
              resolve(undefined)
            }
            return
          }
          case 'piper': {
            if (!ispresent(pipertts)) {
              write(SOFTWARE, player, `${engine} loading...`)
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
              resolve(undefined)
              return
            }
            write(SOFTWARE, player, `${engine} working...`)
            timer = setTimeout(() => {
              cleartimer()
              pipertts?.clearAudio()
              resolve(undefined)
            }, 10000)
            const streamer = new TextSplitterStream()
            streamer.push(input)
            streamer.close()
            const stream = pipertts.stream(streamer, {
              speakerId: parseFloat(voice),
            })
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _ of stream) {
              write(SOFTWARE, player, `${engine} reading...`)
            }
            const rawaudio = pipertts?.merge_audio()
            cleartimer()
            pipertts?.clearAudio()
            write(SOFTWARE, player, `${engine} done...`)
            resolve(
              ispresent(rawaudio) ? convertarraybytes(rawaudio) : undefined,
            )
            return
          }
          default:
            resolve(undefined)
            return
        }
      } catch (err) {
        cleartimer()
        console.error('TTS requestaudiobytes error:', err)
        resolve(undefined)
      }
    })
  })
}
