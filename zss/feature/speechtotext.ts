import { STT_IDLE_DISPOSE_MS } from 'zss/feature/gpu/gpupolicy'
import { sttdispose, sttensure, stttranscribe } from 'zss/feature/stt/sttclient'
import {
  getliveaudiocontext,
  unlockaudiocontext,
} from 'zss/feature/synth/backend/wasm/audiocontextunlock'
import type { MAYBE } from 'zss/mapping/types'

const AUDIO_BUFFER_SIZE = 4096
const MIC_LEVEL_CHECK_CHUNKS = 48
const SPEECH_RMS_THRESHOLD = 0.008
const PAUSE_MS = 750
const MIN_UTTERANCE_MS = 250

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

function concatchunks(chunks: Float32Array[]): Float32Array {
  let total = 0
  for (let i = 0; i < chunks.length; ++i) {
    total += chunks[i].length
  }
  const merged = new Float32Array(total)
  let offset = 0
  for (let i = 0; i < chunks.length; ++i) {
    merged.set(chunks[i], offset)
    offset += chunks[i].length
  }
  return merged
}

function readchunkrms(data: Float32Array): number {
  let sum = 0
  for (let i = 0; i < data.length; ++i) {
    const sample = data[i]
    sum += sample * sample
  }
  return Math.sqrt(sum / Math.max(1, data.length))
}

export class SpeechToText {
  private onfinalised: (value: string) => void
  private onendevent: () => void
  private onworking: (message: string) => void
  private audiocontext: MAYBE<AudioContext>
  private ownsaudiocontext = false
  private mediastream: MAYBE<MediaStream>
  private sourcenode: MAYBE<MediaStreamAudioSourceNode>
  private processornode: MAYBE<ScriptProcessorNode>
  private sinknode: MAYBE<MediaStreamAudioDestinationNode>
  private active = false
  private inspeech = false
  private utterance: Float32Array[] = []
  private utterancestarted = 0
  private lastspeech = 0
  private audiochecks = 0
  private maxpeak = 0
  private transcribing = false
  private idledisposetimer: MAYBE<ReturnType<typeof setTimeout>>

  constructor(
    onfinalised: (value: string) => void,
    onendevent: () => void,
    onworking?: (message: string) => void,
  ) {
    this.onfinalised = onfinalised
    this.onendevent = onendevent
    this.onworking = onworking ?? (() => {})
  }

  async startlistening() {
    try {
      this.cancelidledispose()
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

      this.active = true
      this.inspeech = false
      this.utterance = []
      this.audiochecks = 0
      this.maxpeak = 0
      this.transcribing = false

      this.processornode.onaudioprocess = (event) => {
        if (!this.active) {
          return
        }
        const data = event.inputBuffer.getChannelData(0)
        const chunk = new Float32Array(data)
        let peak = 0
        for (let i = 0; i < chunk.length; ++i) {
          const level = Math.abs(chunk[i])
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

        const now = performance.now()
        const rms = readchunkrms(chunk)
        if (rms >= SPEECH_RMS_THRESHOLD) {
          if (!this.inspeech) {
            this.inspeech = true
            this.utterancestarted = now
            this.utterance = []
            this.onworking('listening ...')
          }
          this.lastspeech = now
        }

        if (this.inspeech) {
          this.utterance.push(chunk)
          const silentfor = now - this.lastspeech
          const utterancems = now - this.utterancestarted
          if (
            silentfor >= PAUSE_MS &&
            utterancems >= MIN_UTTERANCE_MS &&
            !this.transcribing
          ) {
            this.inspeech = false
            const samples = concatchunks(this.utterance)
            this.utterance = []
            void this.transcribeutterance(samples, samplerate)
          }
        }
      }

      this.sourcenode.connect(this.processornode)
      this.processornode.connect(this.sinknode)

      this.onworking('loading speech model ...')
      await sttensure(this.onworking)
      this.onworking('speak, then pause ...')
    } catch (err) {
      console.error('speech recognition failed to start', err)
      this.onworking('speech recognition failed')
      this.cleanup()
      this.onendevent()
    }
  }

  stoplistening() {
    this.cleanup()
    this.scheduleidledispose()
    this.onendevent()
  }

  private cancelidledispose() {
    if (this.idledisposetimer) {
      clearTimeout(this.idledisposetimer)
      this.idledisposetimer = undefined
    }
  }

  private scheduleidledispose() {
    this.cancelidledispose()
    this.idledisposetimer = setTimeout(() => {
      this.idledisposetimer = undefined
      void sttdispose()
    }, STT_IDLE_DISPOSE_MS)
  }

  private async transcribeutterance(samples: Float32Array, samplerate: number) {
    if (samples.length === 0) {
      return
    }
    this.transcribing = true
    try {
      this.onworking('transcribing ...')
      const text = await stttranscribe(samples, samplerate, this.onworking)
      if (text.length > 0) {
        this.onfinalised(text)
      } else {
        this.onworking('no speech recognized')
      }
    } catch (err) {
      console.error('speech transcribe failed', err)
      this.onworking('speech transcribe failed')
    } finally {
      this.transcribing = false
      if (this.active) {
        this.onworking('speak, then pause ...')
      }
    }
  }

  private cleanup() {
    this.cancelidledispose()
    this.active = false
    this.inspeech = false
    this.utterance = []
    this.transcribing = false
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
  }
}
