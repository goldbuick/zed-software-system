import type { KaldiRecognizer, Model } from 'vosk-browser'
import type {
  ServerMessagePartialResult,
  ServerMessageResult,
} from 'vosk-browser/dist/interfaces'
import {
  getliveaudiocontext,
  unlockaudiocontext,
} from 'zss/feature/synth/backend/wasm/audiocontextunlock'
import type { MAYBE } from 'zss/mapping/types'

const MODEL_URL = '/models/vosk-model-small-en-us-0.15.tar.gz'
const AUDIO_BUFFER_SIZE = 4096
const MIC_LEVEL_CHECK_CHUNKS = 48

let sharedmodel: MAYBE<Model>
let sharedmodelpromise: MAYBE<Promise<Model>>

async function loadmodel(onworking: (message: string) => void): Promise<Model> {
  if (sharedmodel) {
    return sharedmodel
  }
  if (sharedmodelpromise) {
    return sharedmodelpromise
  }

  onworking('speech model loading ...')

  sharedmodelpromise = (async () => {
    const { createModel } = await import('vosk-browser')
    return createModel(MODEL_URL, 0)
  })().then((model) => {
    sharedmodel = model
    sharedmodelpromise = undefined
    onworking('speech model ready')
    return model
  })

  return sharedmodelpromise
}

async function waitforrunningaudiocontext(
  audiocontext: AudioContext,
): Promise<void> {
  if (audiocontext.state === 'running') {
    return
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      audiocontext.removeEventListener('statechange', onstate)
      resolve()
    }
    const onstate = () => {
      if (audiocontext.state === 'running') {
        finish()
      }
    }
    audiocontext.addEventListener('statechange', onstate)
    void audiocontext.resume().catch((err: unknown) => {
      audiocontext.removeEventListener('statechange', onstate)
      reject(err instanceof Error ? err : new Error(String(err)))
    })
    if (audiocontext.state === 'running') {
      finish()
    }
  })
}

function chunktoaudiobuffer(
  audiocontext: AudioContext,
  chunk: Float32Array,
): AudioBuffer {
  const buffer = audiocontext.createBuffer(
    1,
    chunk.length,
    audiocontext.sampleRate,
  )
  buffer.copyToChannel(new Float32Array(chunk), 0)
  return buffer
}

export class SpeechToText {
  private onfinalised: (value: string) => void
  private onendevent: () => void
  private onanythingsaid: MAYBE<(value: string) => void>
  private onworking: (message: string) => void
  private recognizer: MAYBE<KaldiRecognizer>
  private audiocontext: MAYBE<AudioContext>
  private ownsaudiocontext = false
  private mediastream: MAYBE<MediaStream>
  private sourcenode: MAYBE<MediaStreamAudioSourceNode>
  private processornode: MAYBE<ScriptProcessorNode>
  private sinknode: MAYBE<MediaStreamAudioDestinationNode>
  private audiobuffer: Float32Array[] = []
  private buffering = true
  private audiochecks = 0
  private maxpeak = 0

  constructor(
    onfinalised: (value: string) => void,
    onendevent: () => void,
    onanythingsaid?: (value: string) => void,
    onworking?: (message: string) => void,
  ) {
    this.onfinalised = onfinalised
    this.onendevent = onendevent
    this.onanythingsaid = onanythingsaid
    this.onworking = onworking ?? (() => {})
  }

  async startlistening() {
    try {
      this.onworking('requesting microphone ...')
      this.mediastream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1,
        },
      })

      const sharedcontext = getliveaudiocontext() ?? unlockaudiocontext()
      this.audiocontext = sharedcontext
      this.ownsaudiocontext = false
      await waitforrunningaudiocontext(this.audiocontext)
      const samplerate = this.audiocontext.sampleRate

      this.sourcenode = this.audiocontext.createMediaStreamSource(
        this.mediastream,
      )
      this.processornode = this.audiocontext.createScriptProcessor(
        AUDIO_BUFFER_SIZE,
        1,
        1,
      )
      this.sinknode = this.audiocontext.createMediaStreamDestination()

      // buffer audio chunks while model loads
      this.buffering = true
      this.audiobuffer = []
      this.audiochecks = 0
      this.maxpeak = 0

      this.processornode.onaudioprocess = (event) => {
        const data = event.inputBuffer.getChannelData(0)
        let peak = 0
        for (let i = 0; i < data.length; ++i) {
          const level = Math.abs(data[i])
          if (level > peak) {
            peak = level
          }
        }
        this.maxpeak = Math.max(this.maxpeak, peak)
        ++this.audiochecks
        if (
          this.audiochecks === MIC_LEVEL_CHECK_CHUNKS &&
          this.maxpeak < 0.001
        ) {
          this.onworking('mic signal very low — check input device')
        }

        if (this.buffering) {
          this.audiobuffer.push(new Float32Array(data))
          return
        }
        try {
          this.recognizer?.acceptWaveform(event.inputBuffer)
        } catch (err) {
          console.error('vosk acceptWaveform failed', err)
        }
      }

      this.sourcenode.connect(this.processornode)
      // keep ScriptProcessor alive without routing mic to speakers
      this.processornode.connect(this.sinknode)

      this.onworking('listening, loading speech model ...')

      // load model while mic is already capturing
      const model = await loadmodel(this.onworking)
      this.recognizer = new model.KaldiRecognizer(samplerate)

      this.recognizer.on('result', (message) => {
        const msg = message as ServerMessageResult
        const text = msg.result?.text ?? ''
        if (text.length > 0) {
          this.onfinalised(text)
        }
      })

      this.recognizer.on('partialresult', (message) => {
        const msg = message as ServerMessagePartialResult
        const partial = msg.result?.partial ?? ''
        if (partial.length > 0 && this.onanythingsaid) {
          this.onanythingsaid(partial)
        }
      })

      this.recognizer.on('error', (message) => {
        console.error('vosk recognizer error', message)
      })

      // replay buffered audio then switch to live
      for (const chunk of this.audiobuffer) {
        this.recognizer.acceptWaveform(
          chunktoaudiobuffer(this.audiocontext, chunk),
        )
      }
      this.audiobuffer = []
      this.buffering = false

      this.onworking('listening ...')
    } catch (err) {
      console.error('vosk speech recognition failed to start', err)
      this.onworking('speech recognition failed')
      this.cleanup()
      this.onendevent()
    }
  }

  stoplistening() {
    this.cleanup()
    this.onendevent()
  }

  private cleanup() {
    this.buffering = false
    this.audiobuffer = []
    if (this.processornode) {
      this.processornode.onaudioprocess = null
      this.processornode.disconnect()
      this.processornode = undefined
    }
    if (this.sourcenode) {
      this.sourcenode.disconnect()
      this.sourcenode = undefined
    }
    if (this.sinknode) {
      this.sinknode.disconnect()
      this.sinknode = undefined
    }
    if (this.audiocontext && this.ownsaudiocontext) {
      void this.audiocontext.close()
    }
    this.audiocontext = undefined
    this.ownsaudiocontext = false
    if (this.mediastream) {
      for (const track of this.mediastream.getTracks()) {
        track.stop()
      }
      this.mediastream = undefined
    }
    if (this.recognizer) {
      this.recognizer.remove()
      this.recognizer = undefined
    }
  }
}
