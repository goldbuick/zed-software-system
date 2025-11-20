import {
  KittenTTS,
  RawAudio as PipeRawAudio,
  PiperTTS,
  TextSplitterStream,
} from 'tts-pipelines'
import { SOFTWARE } from 'zss/device/session'
import { doasync } from 'zss/mapping/func'
import { MAYBE, ispresent } from 'zss/mapping/types'

// yap instances
let kittentts: MAYBE<KittenTTS>
let pipertts: MAYBE<PiperTTS>

function convertarraybytes(rawaudio: PipeRawAudio) {
  return rawaudio.encodeWAV(rawaudio.audio, rawaudio.sampling_rate)
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
            const baseurl =
              'https://raw.githubusercontent.com/clowerweb/kitten-tts-web-demo/refs/heads/main/public/tts-model/'
            KittenTTS.model_path = `${baseurl}model_quantized.onnx`
            KittenTTS.voices_path = `${baseurl}voices.json`
            KittenTTS.tokenizer_path = `${baseurl}tokenizer.json`
            kittentts = await KittenTTS.from_pretrained()
          }
          if (ispresent(kittentts)) {
            const timer = setTimeout(() => resolve(undefined), 10000)
            const streamer = new TextSplitterStream()
            streamer.push(input)
            streamer.close()
            const stream = kittentts.stream(streamer, { voice })
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _ of stream) {
              //
            }
            const rawaudio = kittentts?.merge_audio()
            if (ispresent(rawaudio)) {
              const audiobytes = convertarraybytes(rawaudio)
              clearTimeout(timer)
              resolve(audiobytes)
              kittentts?.clearAudio()
            }
          }
          break
        }
        case 'piper':
          if (!ispresent(pipertts)) {
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
            const timer = setTimeout(() => resolve(undefined), 10000)
            const streamer = new TextSplitterStream()
            streamer.push(input)
            streamer.close()
            const stream = pipertts.stream(streamer, {
              speakerId: parseFloat(voice),
            })
            doasync(SOFTWARE, player, async () => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              for await (const _ of stream) {
                //
              }
              const rawaudio = pipertts?.merge_audio()
              if (ispresent(rawaudio)) {
                const audiobuffer = convertarraybytes(rawaudio)
                clearTimeout(timer)
                resolve(audiobuffer)
                pipertts?.clearAudio()
              }
            })
          }
          break
      }
    })
  })
}
