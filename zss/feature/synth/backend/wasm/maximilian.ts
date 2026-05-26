import { MAYBE } from 'zss/mapping/types'

import { isofflineaudiocontext } from './audiocontextutil'
import { ensuremaximiliancoep } from './coopcoep'
import { WASM_SPIKE_PLAY_CODE } from './spikeplay'
import { WASM_SYNTH_VOICE_PLAY_CODE } from './voiceplaycode'
import { initwasmfxsab } from './wasmfxstate'
import { type WASM_MASTER_CHAIN, wirewasmmasterchain } from './wasmmasterchain'
import {
  WASM_DEFAULT_PLAY_VOLUME,
  WASM_DEFAULT_TTS_VOLUME,
  initwasmmastersab,
  pushwasmmastersab,
} from './wasmmastersab'

const MAXIMILIAN_BASE = '/wasm/maximilian'

function maximilianorigin(): string {
  return new URL(MAXIMILIAN_BASE, window.location.href).href.replace(/\/$/, '')
}

/** Build maximilian eval payload; loop must return the sample (process reads the return value). */
function builddspcode(usercode: string) {
  const code = usercode.replace(/Maximilian/g, 'Module')
  return {
    setup: `() => {
      let q = this.newq();
      q.engine = this;
      let createDSPLoop = () => {
        var qref = q;
        ${code}
        return play;
      }
      q.play = createDSPLoop();
      return q;
    }`,
    loop: `(q, inputsample, mem) => {
      var engine = q.engine;
      if (engine) {
        q.zssVoiceSab = engine.zssVoiceSab;
        q.zssVoiceCfgSab = engine.zssVoiceCfgSab;
        q.zssOscCfgSab = engine.zssOscCfgSab;
        q.zssAlgoCfgSab = engine.zssAlgoCfgSab;
        q.zssDrumSab = engine.zssDrumSab;
        q.zssMasterSab = engine.zssMasterSab;
        q.zssFxSab = engine.zssFxSab;
      }
      var sig = q.play(inputsample);
      if (Array.isArray(sig)) {
        for (let i = 0; i < sig.length; i++) {
          this.dacOut(sig[i], i);
        }
      } else if (sig !== undefined) {
        this.dacOutAll(sig);
      }
      return sig;
    }`,
  }
}

export type MaxiEngine = {
  init: (origin: string) => Promise<boolean>
  play: () => boolean
  setAudioCode: (location: string, name?: string) => Promise<void>
  eval: (dsp: unknown, doresume?: boolean) => boolean
  unHush: () => boolean
  setGain: (gain: number) => boolean
  audioWorkletNode: AudioWorkletNode
  audioContext: AudioContext
  send: (id: string, data: number[]) => void
  createSharedBuffer: (
    channelid: string,
    ttype: string,
    blocksize: number,
  ) => SharedArrayBuffer
  pushDataToSharedBuffer: (channelid: string, data: number[]) => void
  sharedArrayBuffers: Record<string, unknown>
}

declare global {
  function initAudioEngine(origin?: string): Promise<MaxiEngine>
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Window augmentation requires interface
  interface Window {
    __ZSS_MAXIM_AUDIO_CONTEXT__?: AudioContext
  }
}

let unlockedcontext: MAYBE<AudioContext>

/** Call synchronously from a user-gesture handler before any await. */
export function unlockmaximaudiocontext(): AudioContext {
  unlockedcontext ??= new AudioContext({ latencyHint: 'playback' })
  void unlockedcontext.resume()
  return unlockedcontext
}

let synthwasminflight: MAYBE<Promise<MaxiEngine>>
let synthwasmready = false
let maxiengine: MAYBE<MaxiEngine>
let broadcastdestination: MAYBE<MediaStreamAudioDestinationNode>
let broadcasttap: MAYBE<GainNode>
let wasmmaster: MAYBE<WASM_MASTER_CHAIN>
let wasmttssource: MAYBE<AudioBufferSourceNode>

let wasmplayvolume = WASM_DEFAULT_PLAY_VOLUME
let wasmbgplayvolume = 100
let wasmttsvolume = WASM_DEFAULT_TTS_VOLUME

function pushwasmmastervolumes() {
  const maxi = maxiengine
  if (maxi) {
    pushwasmmastersab(maxi, [wasmplayvolume, wasmbgplayvolume, wasmttsvolume])
  }
}

function wirewasmoutput(maxi: MaxiEngine) {
  maxi.audioWorkletNode.disconnect()
  wasmmaster = wirewasmmasterchain(maxi.audioContext, maxi.audioWorkletNode)
  wirebroadcasttap(maxi)
}

function loadscript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.crossOrigin = 'anonymous'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`failed to load ${src}`))
    document.head.appendChild(script)
  })
}

function wirebroadcasttap(maxi: MaxiEngine) {
  broadcastdestination ??= maxi.audioContext.createMediaStreamDestination()
  broadcasttap?.disconnect()
  broadcasttap = maxi.audioContext.createGain()
  broadcasttap.gain.value = 1
  maxi.audioWorkletNode.connect(broadcasttap)
  broadcasttap.connect(broadcastdestination)
}

/** Single-flight load of vendored maximilian-js-local stack. */
async function ensuremaximilianscriptsloaded(): Promise<void> {
  await ensuremaximiliancoep()
  await loadscript(`${MAXIMILIAN_BASE}/maximilian.v.0.1.js`)
  if (typeof initAudioEngine !== 'function') {
    throw new Error('initAudioEngine missing after maximilian load')
  }
}

/** Boot a fresh Maximilian engine on an injected context (live or offline). */
export async function bootisolatedmaxiengine(
  ctx: BaseAudioContext,
): Promise<MaxiEngine> {
  await ensuremaximilianscriptsloaded()
  const saved = window.__ZSS_MAXIM_AUDIO_CONTEXT__
  window.__ZSS_MAXIM_AUDIO_CONTEXT__ = ctx as AudioContext
  try {
    return await initAudioEngine(maximilianorigin())
  } finally {
    if (saved !== undefined) {
      window.__ZSS_MAXIM_AUDIO_CONTEXT__ = saved
    } else {
      delete window.__ZSS_MAXIM_AUDIO_CONTEXT__
    }
  }
}

/** Voice DSP boot for an isolated engine (no broadcast tap). */
export async function startisolatedmaximiliandsp(
  maxi: MaxiEngine,
  usercode: string,
  playvolume: number,
  bgplayvolume: number,
  ttsvolume: number,
) {
  await resumeaudiocontext(maxi)
  maxi.audioWorkletNode.disconnect()
  wirewasmmasterchain(maxi.audioContext, maxi.audioWorkletNode)
  initwasmmastersab(maxi, playvolume, bgplayvolume, ttsvolume)
  initwasmfxsab(maxi)
  const ready = waitforwasmdspready(maxi)
  maxi.eval(builddspcode(usercode), false)
  await ready
  maxi.unHush()
  maxi.setGain(1)
}

/** Single-flight load of vendored maximilian-js-local stack. */
export async function ensuresynthwasm(): Promise<MaxiEngine> {
  if (maxiengine && synthwasmready) {
    return maxiengine
  }

  synthwasminflight ??= (async () => {
    if (unlockedcontext) {
      window.__ZSS_MAXIM_AUDIO_CONTEXT__ = unlockedcontext
    }
    await ensuremaximilianscriptsloaded()
    const engine = await initAudioEngine(maximilianorigin())
    maxiengine = engine
    synthwasmready = true
    return engine
  })()

  return synthwasminflight
}

const SILENT_PLAY_CODE = `
function play(inputsample) {
  return 0;
}
`

async function resumeaudiocontext(maxi: MaxiEngine) {
  const ctx = maxi.audioContext
  if (isofflineaudiocontext(ctx)) {
    return
  }
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}

function waitforwasmdspready(
  maxi: MaxiEngine,
  timeoutms = 3000,
): Promise<void> {
  const port = maxi.audioWorkletNode?.port
  if (!port) {
    return Promise.reject(new Error('wasm worklet port missing'))
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      port.removeEventListener('message', onmsg)
      reject(new Error('wasm dsp eval timed out'))
    }, timeoutms)

    function onmsg(event: MessageEvent) {
      const data = event.data as {
        zss_dsp_ready?: number
        zss_dsp_error?: string
      }
      if (data?.zss_dsp_ready) {
        clearTimeout(timer)
        port.removeEventListener('message', onmsg)
        resolve()
      } else if (data?.zss_dsp_error) {
        clearTimeout(timer)
        port.removeEventListener('message', onmsg)
        reject(new Error(data.zss_dsp_error))
      }
    }

    port.addEventListener('message', onmsg)
  })
}

async function startmaximiliandsp(maxi: MaxiEngine, usercode: string) {
  await resumeaudiocontext(maxi)
  wirewasmoutput(maxi)
  initwasmmastersab(maxi, wasmplayvolume, wasmbgplayvolume, wasmttsvolume)
  initwasmfxsab(maxi)
  const ready = waitforwasmdspready(maxi)
  maxi.eval(builddspcode(usercode))
  await ready
  maxi.unHush()
  maxi.setGain(1)
}

async function startmaximilianspike(maxi: MaxiEngine) {
  await startmaximiliandsp(maxi, WASM_SPIKE_PLAY_CODE)
}

/** Init WASM worklet with silence (no 440 Hz spike). */
export async function initsilentwasmsynth(): Promise<void> {
  const maxi = await ensuresynthwasm()
  await startmaximiliandsp(maxi, SILENT_PLAY_CODE)
}

/** Phase 1+: full voice routing (square default) + drums. */
export async function initwasmsynthvoices(): Promise<void> {
  const maxi = await ensuresynthwasm()
  await startmaximiliandsp(maxi, WASM_SYNTH_VOICE_PLAY_CODE)
}

/** Full voice + drum DSP (requires zssenv; heavier setup). */
export async function initwasmfullsynthvoices(): Promise<void> {
  const maxi = await ensuresynthwasm()
  await startmaximiliandsp(maxi, WASM_SYNTH_VOICE_PLAY_CODE)
}

/** Phase 0: audible check — 440 Hz saw through WASM worklet. */
export async function spikesynthwasm(): Promise<void> {
  const maxi = await ensuresynthwasm()
  await startmaximilianspike(maxi)
}

export function getmaximaudiocontext(): MAYBE<AudioContext> {
  return maxiengine?.audioContext ?? unlockedcontext
}

export function setwasmsynthttsvolume(volume: number) {
  wasmttsvolume = volume
  pushwasmmastervolumes()
}

export function playwasmaudiobuffer(audiobuffer: AudioBuffer) {
  const maxi = maxiengine
  if (!maxi) {
    return
  }
  try {
    wasmttssource?.stop()
  } catch {
    // prior TTS may have ended
  }
  wasmttssource = undefined

  const ctx = maxi.audioContext
  const worklet = maxi.audioWorkletNode
  const source = ctx.createBufferSource()
  source.buffer = audiobuffer
  const gain = ctx.createGain()
  gain.gain.value = 1
  gain.channelCount = 1
  gain.channelCountMode = 'explicit'
  gain.channelInterpretation = 'speakers'
  source.connect(gain)
  gain.connect(worklet, 0, 0)
  source.start(0)
  wasmttssource = source
}

export function getmaxiengine(): MAYBE<MaxiEngine> {
  return maxiengine
}

export {
  initwasmsabchannels,
  pushwasmsabvalues,
  resetwasmsabregistry,
  wasmsabsnapshot,
} from './sabpush'

export function setwasmsynthplayvolume(volume: number) {
  wasmplayvolume = volume
  pushwasmmastervolumes()
}

export function setwasmsynthbgplayvolume(volume: number) {
  wasmbgplayvolume = volume
  pushwasmmastervolumes()
}

export function getwasmmasterchain(): MAYBE<WASM_MASTER_CHAIN> {
  return wasmmaster
}

/** Restore worklet → destination wiring after temporary capture tap. */
export function rewirewasmoutput() {
  const maxi = maxiengine
  if (maxi) {
    wirewasmoutput(maxi)
  }
}

export function getwasmbroadcastdestination(): MAYBE<MediaStreamAudioDestinationNode> {
  return broadcastdestination
}

export { initwasmmastersab } from './wasmmastersab'
