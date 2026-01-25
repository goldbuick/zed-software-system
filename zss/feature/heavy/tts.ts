import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { doasync } from 'zss/mapping/func'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { KittenTTS } from './kittentts'
import { PiperTTS } from './pipertts'
import { RawAudio, TextSplitterStream } from './utils'

// yap instances
let kittentts: MAYBE<KittenTTS>
let pipertts: MAYBE<PiperTTS>

function convertarraybytes(rawaudio: RawAudio) {
  return rawaudio.encodeWAV(rawaudio.audio, rawaudio.sampling_rate)
}

export function requestinfo(
  player: string,
  engine: 'kitten' | 'piper',
  info: string,
): Promise<any> {
  return new Promise((resolve) => {
    doasync(SOFTWARE, player, async () => {
      switch (engine) {
        case 'kitten': {
          if (!ispresent(kittentts)) {
            write(SOFTWARE, player, `${engine} loading...`)
            kittentts = await KittenTTS.from_pretrained()
          }
          if (ispresent(kittentts)) {
            switch (info) {
              case 'voices':
                resolve(kittentts.voices.map((voice) => voice.id))
                break
            }
            resolve([])
          }
          break
        }
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
                resolve([`numbers 0-${pipertts.voiceConfig.num_speakers - 1}`])
                break
            }
            resolve([])
          }
          break
      }
    })
  })
}

export function requestaudiobytes(
  player: string,
  engine: 'kitten' | 'piper',
  config: string,
  voice: string,
  input: string,
): Promise<MAYBE<ArrayBuffer>> {
  return new Promise((resolve) => {
    doasync(SOFTWARE, player, async () => {
      switch (engine) {
        case 'kitten': {
          if (!ispresent(kittentts)) {
            write(SOFTWARE, player, `${engine} loading...`)
            kittentts = await KittenTTS.from_pretrained()
          }
          if (ispresent(kittentts)) {
            write(SOFTWARE, player, `${engine} working...`)
            const timer = setTimeout(() => resolve(undefined), 10000)
            const streamer = new TextSplitterStream()
            streamer.push(input)
            streamer.close()
            const stream = kittentts.stream(streamer, { voice })
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _ of stream) {
              write(SOFTWARE, player, `${engine} reading...`)
            }
            const rawaudio = kittentts?.merge_audio()
            if (ispresent(rawaudio)) {
              const audiobytes = convertarraybytes(rawaudio)
              clearTimeout(timer)
              kittentts?.clearAudio()
              write(SOFTWARE, player, `${engine} done...`)
              resolve(audiobytes)
            }
          }
          break
        }
        case 'piper':
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
          if (ispresent(pipertts)) {
            write(SOFTWARE, player, `${engine} working...`)
            const timer = setTimeout(() => resolve(undefined), 10000)
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
            clearTimeout(timer)
            pipertts?.clearAudio()
            write(SOFTWARE, player, `${engine} done...`)
            if (ispresent(rawaudio)) {
              const audiobuffer = convertarraybytes(rawaudio)
              resolve(audiobuffer)
            } else {
              resolve(undefined)
            }
          }
          break
      }
    })
  })
}
