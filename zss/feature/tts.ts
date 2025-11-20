/* eslint-disable @typescript-eslint/no-floating-promises */
import { newQueue } from '@henrygd/queue'
import { EdgeSpeechTTS, OpenAITTS } from '@lobehub/tts'
import {
  KittenTTS,
  RawAudio as PipeRawAudio,
  PiperTTS,
  TextSplitterStream,
} from 'tts-pipelines'
import { synth_audiobuffer, synth_audiobytes } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'

// yap instances
let edgetts: MAYBE<EdgeSpeechTTS>
let kittentts: MAYBE<KittenTTS>
let openaitts: MAYBE<OpenAITTS>
let pipertts: MAYBE<PiperTTS>

export async function selectttsengine(
  engine: 'edge' | 'openai' | 'kokoro' | 'piper' | 'kitten',
  config: string,
) {
  switch (engine) {
    case 'edge':
      kittentts = undefined
      openaitts = undefined
      pipertts = undefined
      if (!ispresent(edgetts)) {
        edgetts = new EdgeSpeechTTS({ locale: 'en-US' })
      }
      break
    case 'kitten':
      edgetts = undefined
      openaitts = undefined
      pipertts = undefined
      if (!ispresent(kittentts)) {
        const baseurl =
          'https://raw.githubusercontent.com/clowerweb/kitten-tts-web-demo/refs/heads/main/public/tts-model/'
        KittenTTS.model_path = `${baseurl}model_quantized.onnx`
        KittenTTS.voices_path = `${baseurl}voices.json`
        KittenTTS.tokenizer_path = `${baseurl}tokenizer.json`
        kittentts = await KittenTTS.from_pretrained()
      }
      break
    case 'openai':
      edgetts = undefined
      kittentts = undefined
      pipertts = undefined
      if (!ispresent(openaitts)) {
        openaitts = new OpenAITTS({ OPENAI_API_KEY: config })
      }
      break
    case 'piper':
      edgetts = undefined
      kittentts = undefined
      openaitts = undefined
      if (!ispresent(pipertts)) {
        if (config) {
          const baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${config}`
          pipertts = await PiperTTS.from_pretrained(baseurl, `${baseurl}.json`)
        } else {
          const baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx`
          pipertts = await PiperTTS.from_pretrained(baseurl, `${baseurl}.json`)
        }
      }
      break
  }
}

function convertarraybytes(rawaudio: PipeRawAudio) {
  return rawaudio.encodeWAV(rawaudio.audio, rawaudio.sampling_rate)
}

async function requestaudiobuffer(
  player: string,
  voice: string,
  input: string,
): Promise<MAYBE<AudioBuffer | ArrayBuffer>> {
  return new Promise((resolve) => {
    if (ispresent(edgetts)) {
      const timer = setTimeout(() => resolve(undefined), 5000)
      edgetts
        .createAudio({
          input,
          options: { voice },
        })
        .then((audiobuffer) => {
          clearTimeout(timer)
          resolve(audiobuffer)
        })
    } else if (ispresent(kittentts)) {
      const timer = setTimeout(() => resolve(undefined), 10000)
      const streamer = new TextSplitterStream()
      streamer.push(input)
      streamer.close()
      const stream = kittentts.stream(streamer, { voice })
      doasync(SOFTWARE, player, async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of stream) {
          //
        }
        const rawaudio = kittentts?.merge_audio()
        if (ispresent(rawaudio)) {
          const audiobuffer = convertarraybytes(rawaudio)
          clearTimeout(timer)
          resolve(audiobuffer)
          kittentts?.clearAudio()
        }
      })
    } else if (ispresent(pipertts)) {
      const timer = setTimeout(() => resolve(undefined), 10000)
      const streamer = new TextSplitterStream()
      streamer.push(input)
      streamer.close()
      const stream = pipertts.stream(streamer, { speakerId: parseFloat(voice) })
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
    } else if (ispresent(openaitts)) {
      const timer = setTimeout(() => resolve(undefined), 10000)
      openaitts
        .createAudio({
          input,
          options: {
            model: 'tts-1',
            voice: voice as any,
          },
        })
        .then((audiobuffer) => {
          clearTimeout(timer)
          resolve(audiobuffer)
        })
    } else {
      selectttsengine('edge', '').then(() => {
        requestaudiobuffer(player, voice, input).then(resolve)
      })
    }
  })
}

export async function ttsplay(
  player: string,
  voice: string,
  input: string,
): Promise<void> {
  if (input.trim() === '') {
    return
  }
  // play the audio
  const buffer = await requestaudiobuffer(player, voice, input)
  if (ispresent(buffer)) {
    if (buffer instanceof ArrayBuffer) {
      synth_audiobytes(SOFTWARE, player, buffer)
    } else {
      synth_audiobuffer(SOFTWARE, player, buffer)
    }
  }
}

// audio playback queue
const audioplayqueue = newQueue(1)

async function audioplaytask(
  player: string,
  audiobuffer: AudioBuffer,
): Promise<void> {
  // play the audio
  synth_audiobuffer(SOFTWARE, player, audiobuffer)

  // wait audio duration before playing next audio
  const waittime = Math.max(1000, Math.round(audiobuffer.duration * 1000))
  await waitfor(waittime)
}

// audio buffer request queue
const audiobufferqueue = newQueue(1)

async function audiobuffertask(
  player: string,
  voice: string,
  input: string,
): Promise<void> {
  const audiobuffer = await requestaudiobuffer(player, voice, input)
  audioplayqueue.add(async () => {
    if (ispresent(audiobuffer)) {
      await audioplaytask(player, audiobuffer)
    }
  })
}

export function ttsqueue(player: string, voice: string, input: string) {
  audiobufferqueue.add(async () => {
    await audiobuffertask(player, voice, input)
  })
}

export function ttsclearqueue() {
  audioplayqueue.clear()
  audiobufferqueue.clear()
}
