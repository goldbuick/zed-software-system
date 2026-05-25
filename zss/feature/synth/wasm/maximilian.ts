import { MAYBE } from 'zss/mapping/types'

import { ensuremaximiliancoep } from './coopcoep'
import { pushwasmsabvalues } from './sabpush'
import {
  wirewasmmasterchain,
  type WASM_MASTER_CHAIN,
} from './wasmmasterchain'
import { WASM_SAB_VOICE_PLAY_CODE } from './sabvoiceplay'
import { WASM_SPIKE_PLAY_CODE } from './spikeplay'
import { WASM_SYNTH_VOICE_PLAY_CODE } from './voiceplaycode'
import { initwasmfxsab } from './wasmfxstate'

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
    loop: `(q, inputs, mem) => {
      var engine = q.engine;
      if (engine) {
        q.zssVoiceSab = engine.zssVoiceSab;
        q.zssVoiceCfgSab = engine.zssVoiceCfgSab;
        q.zssDrumSab = engine.zssDrumSab;
        q.zssMasterSab = engine.zssMasterSab;
        q.zssFxSab = engine.zssFxSab;
      }
      var sig = q.play(inputs);
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

let wasmplayvolume = 80
let wasmbgplayvolume = 100

function pushwasmmastervolumes() {
  const maxi = maxiengine
  if (maxi) {
    pushwasmsabvalues(maxi, WASM_MASTER_SAB, [wasmplayvolume, wasmbgplayvolume])
  }
}

const WASM_MASTER_SAB = 'zss_master'

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
export async function ensuresynthwasm(): Promise<MaxiEngine> {
  if (maxiengine && synthwasmready) {
    return maxiengine
  }

  synthwasminflight ??= (async () => {
    await ensuremaximiliancoep()
    if (unlockedcontext) {
      window.__ZSS_MAXIM_AUDIO_CONTEXT__ = unlockedcontext
    }
    await loadscript(`${MAXIMILIAN_BASE}/maximilian.v.0.1.js`)
    if (typeof initAudioEngine !== 'function') {
      throw new Error('initAudioEngine missing after maximilian load')
    }
    const engine = await initAudioEngine(maximilianorigin())
    maxiengine = engine
    synthwasmready = true
    return engine
  })()

  return synthwasminflight
}

const SILENT_PLAY_CODE = `
function play() {
  return 0;
}
`

let wasmttsvolume = 25

/** Matches default `setplayvolume(80)` trim used by TTS gain helper. */
function volumetodb(value: number) {
  return 20 * Math.log10(value) - 35
}

/** Matches default `setplayvolume(80)` → `mainvolume` trim in Tone chain. */
const WASM_DEFAULT_MAIN_TRIM_DB = volumetodb(80 * 0.25)
/** Approximate razzle/compressor headroom absent in phase 0 WASM playback. */
const WASM_TTS_CHAIN_TRIM_DB = -20

function wasmttsgainvalue(): number {
  const db = wasmttsvolume + WASM_DEFAULT_MAIN_TRIM_DB + WASM_TTS_CHAIN_TRIM_DB
  return Math.pow(10, db / 20)
}

async function resumeaudiocontext(maxi: MaxiEngine) {
  const ctx = maxi.audioContext
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}

function waitforwasmdspready(maxi: MaxiEngine, timeoutms = 3000): Promise<void> {
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
      const data = event.data as { zss_dsp_ready?: number; zss_dsp_error?: string }
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
  initwasmmastersab(maxi, 80)
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
}

export function playwasmaudiobuffer(audiobuffer: AudioBuffer) {
  const maxi = maxiengine
  if (!maxi) {
    return
  }
  const ctx = maxi.audioContext
  const source = ctx.createBufferSource()
  source.buffer = audiobuffer
  const gain = ctx.createGain()
  const ttsgain = wasmttsgainvalue()
  gain.gain.value = ttsgain
  gain.channelCount = 1
  gain.channelCountMode = 'explicit'
  gain.channelInterpretation = 'speakers'
  source.connect(gain)
  gain.connect(ctx.destination)
  if (broadcastdestination) {
    const tap = ctx.createGain()
    tap.gain.value = ttsgain
    source.connect(tap)
    tap.connect(broadcastdestination)
  }
  source.start(0)
}

export function getmaxiengine(): MAYBE<MaxiEngine> {
  return maxiengine
}

export { pushwasmsabvalues } from './sabpush'

export function initwasmmastersab(
  maxi: MaxiEngine,
  playvolume = 80,
  bgplayvolume = 100,
) {
  wasmplayvolume = playvolume
  wasmbgplayvolume = bgplayvolume
  pushwasmsabvalues(maxi, WASM_MASTER_SAB, [wasmplayvolume, wasmbgplayvolume])
}

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

export function getwasmbroadcastdestination(): MAYBE<MediaStreamAudioDestinationNode> {
  return broadcastdestination
}
