/* eslint-disable @typescript-eslint/no-floating-promises */
import { newQueue } from '@henrygd/queue'
import { EdgeSpeechTTS, OpenAITTS } from '@lobehub/tts'
import { KokoroTTS } from 'kokoro-js'
import { getContext } from 'tone'
import {
  KittenTTS,
  RawAudio as PipeRawAudio,
  PiperTTS,
  TextSplitterStream,
} from 'tts-pipelines'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'

// yap instances
let edgetts: MAYBE<EdgeSpeechTTS>
let kokorotts: MAYBE<KokoroTTS>
let kittentts: MAYBE<KittenTTS>
let openaitts: MAYBE<OpenAITTS>
let pipertts: MAYBE<PiperTTS>

function haltttsengine() {
  edgetts = undefined
  kokorotts = undefined
  kittentts = undefined
  openaitts = undefined
  pipertts = undefined
}

export async function selectttsengine(
  engine: 'edge' | 'openai' | 'kokoro' | 'piper' | 'kitten',
  config: string,
) {
  haltttsengine()
  switch (engine) {
    case 'edge':
      edgetts = new EdgeSpeechTTS({ locale: 'en-US' })
      break
    case 'kokoro':
      // TODO, detect webgpu support
      kokorotts = await KokoroTTS.from_pretrained(
        'onnx-community/Kokoro-82M-v1.0-ONNX',
        {
          dtype: 'fp32',
          device: 'webgpu',
        },
      )
      break
    case 'kitten': {
      const baseurl =
        'https://raw.githubusercontent.com/clowerweb/kitten-tts-web-demo/refs/heads/main/public/tts-model/'
      KittenTTS.model_path = `${baseurl}model_quantized.onnx`
      KittenTTS.voices_path = `${baseurl}voices.json`
      KittenTTS.tokenizer_path = `${baseurl}tokenizer.json`
      kittentts = await KittenTTS.from_pretrained()
      break
    }
    case 'openai':
      openaitts = new OpenAITTS({ OPENAI_API_KEY: config })
      break
    case 'piper':
      if (config) {
        const baseurl = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${config}`
        pipertts = await PiperTTS.from_pretrained(baseurl, `${baseurl}.json`)
      } else {
        pipertts = await PiperTTS.from_pretrained()
      }
      break
  }
}

function convertarraybuffer(rawaudio: PipeRawAudio) {
  return getContext().decodeAudioData(
    rawaudio.encodeWAV(rawaudio.audio, rawaudio.sampling_rate),
  )
}

async function requestaudiobuffer(
  voice: string,
  input: string,
): Promise<MAYBE<AudioBuffer>> {
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
    } else if (ispresent(kokorotts)) {
      const timer = setTimeout(() => resolve(undefined), 10000)
      kokorotts
        .generate(input, {
          voice: voice as any,
        })
        .then((rawaudio) => getContext().decodeAudioData(rawaudio.toWav()))
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
      doasync(SOFTWARE, registerreadplayer(), async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of stream) {
          //
        }
        const rawaudio = kittentts?.merge_audio()
        if (ispresent(rawaudio)) {
          const audiobuffer = await convertarraybuffer(rawaudio)
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

      const stream = pipertts.stream(streamer)
      doasync(SOFTWARE, registerreadplayer(), async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of stream) {
          //
        }
        const rawaudio = pipertts?.merge_audio()
        if (ispresent(rawaudio)) {
          const audiobuffer = await convertarraybuffer(rawaudio)
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
        requestaudiobuffer(voice, input).then(resolve)
      })
    }
  })
}

export async function ttsplay(
  synth: MAYBE<AUDIO_SYNTH>,
  voice: string,
  input: string,
): Promise<void> {
  if (!ispresent(synth) || input.trim() === '') {
    return
  }
  // play the audio
  const audiobuffer = await requestaudiobuffer(voice, input)
  if (ispresent(audiobuffer)) {
    synth.addttsaudiobuffer(audiobuffer)
  }
}

// audio playback queue
const audioplayqueue = newQueue(1)

async function audioplaytask(
  synth: MAYBE<AUDIO_SYNTH>,
  audiobuffer: AudioBuffer,
): Promise<void> {
  if (!ispresent(synth)) {
    return
  }

  // play the audio
  synth.addttsaudiobuffer(audiobuffer)

  // wait audio duration before playing next audio
  const waittime = Math.max(1000, Math.round(audiobuffer.duration * 1000))
  await waitfor(waittime)
}

// audio buffer request queue
const audiobufferqueue = newQueue(1)

async function audiobuffertask(
  synth: MAYBE<AUDIO_SYNTH>,
  voice: string,
  input: string,
): Promise<void> {
  const audiobuffer = await requestaudiobuffer(voice, input)
  audioplayqueue.add(async () => {
    if (ispresent(audiobuffer)) {
      await audioplaytask(synth, audiobuffer)
    }
  })
}

export function ttsqueue(
  synth: MAYBE<AUDIO_SYNTH>,
  voice: string,
  input: string,
) {
  audiobufferqueue.add(async () => {
    await audiobuffertask(synth, voice, input)
  })
}

export function ttsclearqueue() {
  audioplayqueue.clear()
  audiobufferqueue.clear()
}
