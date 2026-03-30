import type { KaldiRecognizer, Model } from 'vosk-browser'
import type {
  ServerMessagePartialResult,
  ServerMessageResult,
} from 'vosk-browser/dist/interfaces'
import type { MAYBE } from 'zss/mapping/types'

const MODEL_URL = '/models/vosk-model-small-en-us-0.15.tar.gz'
const AUDIO_BUFFER_SIZE = 4096

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
    return createModel(MODEL_URL)
  })().then((model) => {
    sharedmodel = model
    sharedmodelpromise = undefined
    onworking('speech model ready')
    return model
  })

  return sharedmodelpromise
}

export class SpeechToText {
  private onfinalised: (value: string) => void
  private onendevent: () => void
  private onanythingsaid: MAYBE<(value: string) => void>
  private onworking: (message: string) => void
  private recognizer: MAYBE<KaldiRecognizer>
  private audiocontext: MAYBE<AudioContext>
  private mediastream: MAYBE<MediaStream>
  private sourcenode: MAYBE<MediaStreamAudioSourceNode>
  private processornode: MAYBE<ScriptProcessorNode>
  private audiobuffer: Float32Array[] = []
  private buffering = true

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
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      })

      this.audiocontext = new AudioContext()
      const samplerate = this.audiocontext.sampleRate

      this.sourcenode = this.audiocontext.createMediaStreamSource(
        this.mediastream,
      )
      this.processornode = this.audiocontext.createScriptProcessor(
        AUDIO_BUFFER_SIZE,
        1,
        1,
      )

      // buffer audio chunks while model loads
      this.buffering = true
      this.audiobuffer = []

      this.processornode.onaudioprocess = (event) => {
        if (this.buffering) {
          const data = event.inputBuffer.getChannelData(0)
          this.audiobuffer.push(new Float32Array(data))
          return
        }
        try {
          this.recognizer?.acceptWaveform(event.inputBuffer)
        } catch {
          // recognition may fail transiently
        }
      }

      this.sourcenode.connect(this.processornode)
      this.processornode.connect(this.audiocontext.destination)

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

      // replay buffered audio then switch to live
      for (const chunk of this.audiobuffer) {
        this.recognizer.acceptWaveformFloat(chunk, samplerate)
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
    if (this.audiocontext) {
      void this.audiocontext.close()
      this.audiocontext = undefined
    }
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
