import { MAYBE } from 'zss/mapping/types'

import type { SabEngine } from '../shared/sabengine'
import { isofflineaudiocontext } from '../wasm/audiocontextutil'
import { ensuremaximiliancoep } from '../wasm/coopcoep'
import { getunlockedaudiocontext } from '../wasm/maximilian'
import { initwasmfxsab } from '../wasm/wasmfxstate'
import { wirewasmmasterchain } from '../wasm/wasmmasterchain'
import {
  WASM_DEFAULT_PLAY_VOLUME,
  WASM_DEFAULT_TTS_VOLUME,
  initwasmmastersab,
  pushwasmmastersab,
} from '../wasm/wasmmastersab'

import { daisyasseturl } from './daisypaths'

function asaudiocontext(ctx: BaseAudioContext): AudioContext {
  return ctx as AudioContext
}

export type DaisyEngine = SabEngine

let daisyengine: MAYBE<DaisyEngine>
let daisyloadinflight: MAYBE<Promise<DaisyEngine>>
let daisyready = false
let daisybroadcastdestination: MAYBE<MediaStreamAudioDestinationNode>
let daisybroadcasttap: MAYBE<GainNode>
let daisyttssource: MAYBE<AudioBufferSourceNode>

let daisyplayvolume = WASM_DEFAULT_PLAY_VOLUME
let daisybgplayvolume = 100
let daisyttsvolume = WASM_DEFAULT_TTS_VOLUME

function pushdaisymastervolumes(maxi: DaisyEngine) {
  pushwasmmastersab(maxi, [daisyplayvolume, daisybgplayvolume, daisyttsvolume])
}

function wirebroadcasttap(maxi: DaisyEngine) {
  const ctx = asaudiocontext(maxi.audioContext)
  daisybroadcastdestination ??= ctx.createMediaStreamDestination()
  daisybroadcasttap?.disconnect()
  daisybroadcasttap = ctx.createGain()
  daisybroadcasttap.gain.value = 1
  maxi.audioWorkletNode.connect(daisybroadcasttap)
  daisybroadcasttap.connect(daisybroadcastdestination)
}

function wireoutput(maxi: DaisyEngine) {
  maxi.audioWorkletNode.disconnect()
  wirewasmmasterchain(audiocontext(maxi), maxi.audioWorkletNode)
  wirebroadcasttap(maxi)
}

function audiocontext(maxi: DaisyEngine): AudioContext {
  return asaudiocontext(maxi.audioContext)
}

function waitfordaisyready(
  worklet: AudioWorkletNode,
  timeoutms = 8000,
): Promise<void> {
  const port = worklet.port
  return new Promise((resolve, reject) => {
    let laststage = 'none'

    function cleanup() {
      clearTimeout(timer)
      port.removeEventListener('message', onmsg)
      port.onmessageerror = null
    }

    const timer = setTimeout(() => {
      cleanup()
      reject(
        new Error(`daisy wasm dsp boot timed out (last stage: ${laststage})`),
      )
    }, timeoutms)

    function onmsg(event: MessageEvent) {
      const data = event.data as {
        zss_dsp_ready?: number
        zss_dsp_error?: string
        zss_dsp_stage?: string
      }
      if (data?.zss_dsp_stage) {
        laststage = data.zss_dsp_stage
        if (import.meta.env.DEV) {
          console.warn('[daisy boot]', data.zss_dsp_stage)
        }
        return
      }
      if (data?.zss_dsp_ready) {
        cleanup()
        resolve()
      } else if (data?.zss_dsp_error) {
        cleanup()
        reject(new Error(data.zss_dsp_error))
      }
    }

    port.onmessageerror = () => {
      cleanup()
      reject(new Error('daisy worklet port message error'))
    }
    port.addEventListener('message', onmsg)
  })
}

async function resumecontext(ctx: BaseAudioContext) {
  if (isofflineaudiocontext(ctx)) {
    return
  }
  const live = asaudiocontext(ctx)
  if (live.state === 'suspended') {
    await live.resume()
  }
}

async function bootdaisyoncontext(ctx: BaseAudioContext): Promise<DaisyEngine> {
  await ensuremaximiliancoep()
  const wasmurl = daisyasseturl('zss_daisy.wasm')
  const processorurl = daisyasseturl('daisy-processor.js')
  await ctx.audioWorklet.addModule(processorurl, {
    type: 'module',
  } as WorkletOptions)
  const wasmresponse = await fetch(wasmurl)
  if (!wasmresponse.ok) {
    throw new Error(`failed to fetch ${wasmurl}`)
  }
  const wasmbytes = await wasmresponse.arrayBuffer()
  await WebAssembly.compile(wasmbytes)

  const worklet = new AudioWorkletNode(ctx, 'zss-daisy-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  })
  worklet.channelCount = 1
  worklet.channelCountMode = 'explicit'
  worklet.channelInterpretation = 'speakers'

  await resumecontext(ctx)
  if (!isofflineaudiocontext(ctx)) {
    wirewasmmasterchain(asaudiocontext(ctx), worklet)
  } else {
    worklet.connect(ctx.destination)
  }

  const ready = waitfordaisyready(worklet)
  worklet.port.postMessage({ zss_boot: 1, wasmbytes })
  await ready

  const engine: DaisyEngine = {
    audioContext: ctx,
    audioWorkletNode: worklet,
  }
  wireoutput(engine)
  initwasmmastersab(engine, daisyplayvolume, daisybgplayvolume, daisyttsvolume)
  initwasmfxsab(engine)
  return engine
}

export async function bootisolateddaisyengine(
  ctx: BaseAudioContext,
): Promise<DaisyEngine> {
  return bootdaisyoncontext(ctx)
}

export async function ensuredaisysynthwasm(): Promise<DaisyEngine> {
  if (daisyengine && daisyready) {
    return daisyengine
  }

  daisyloadinflight ??= (async () => {
    try {
      const ctx = getunlockedaudiocontext() ?? new AudioContext()
      await resumecontext(ctx)
      const engine = await bootdaisyoncontext(ctx)
      daisyengine = engine
      daisyready = true
      return engine
    } catch (err) {
      daisyloadinflight = undefined
      throw err
    }
  })()

  return daisyloadinflight
}

export async function startisolateddaisydsp(
  engine: DaisyEngine,
  playvolume: number,
  bgplayvolume: number,
  ttsvolume: number,
) {
  daisyplayvolume = playvolume
  daisybgplayvolume = bgplayvolume
  daisyttsvolume = ttsvolume
  initwasmmastersab(engine, playvolume, bgplayvolume, ttsvolume)
  initwasmfxsab(engine)
}

export function getdaisyengine(): MAYBE<DaisyEngine> {
  return daisyengine
}

export function getdaisyaudiocontext(): MAYBE<AudioContext> {
  const ctx = daisyengine?.audioContext
  if (ctx && !isofflineaudiocontext(ctx)) {
    return ctx as AudioContext
  }
  return getunlockedaudiocontext()
}

export function setdaisysynthplayvolume(volume: number) {
  daisyplayvolume = volume
  const engine = daisyengine
  if (engine) {
    pushdaisymastervolumes(engine)
  }
}

export function setdaisysynthbgplayvolume(volume: number) {
  daisybgplayvolume = volume
  const engine = daisyengine
  if (engine) {
    pushdaisymastervolumes(engine)
  }
}

export function setdaisysynthttsvolume(volume: number) {
  daisyttsvolume = volume
  const engine = daisyengine
  if (engine) {
    pushdaisymastervolumes(engine)
  }
}

export function playdaisyaudiobuffer(audiobuffer: AudioBuffer) {
  const engine = daisyengine
  if (!engine) {
    return
  }
  try {
    daisyttssource?.stop()
  } catch {
    // prior TTS may have ended
  }
  daisyttssource = undefined

  const ctx = engine.audioContext
  const worklet = engine.audioWorkletNode
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
  daisyttssource = source
}

export function getdaisybroadcastdestination(): MAYBE<MediaStreamAudioDestinationNode> {
  return daisybroadcastdestination
}

export function rewiredaisyoutput() {
  const engine = daisyengine
  if (engine) {
    wireoutput(engine)
  }
}

export {
  initwasmsabchannels,
  pushwasmsabvalues,
  resetwasmsabregistry,
  wasmsabsnapshot,
} from '../wasm/sabpush'

export { initwasmmastersab } from '../wasm/wasmmastersab'
