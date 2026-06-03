import { MAYBE } from 'zss/mapping/types'

import type { SabEngine } from '../shared/sabengine'
import {
  getunlockedaudiocontext,
  setliveaudiocontext,
} from '../wasm/audiocontextunlock'
import { isofflineaudiocontext } from '../wasm/audiocontextutil'
import { ensurewasmcoep } from '../wasm/coopcoep'
import { initwasmfxsab } from '../wasm/wasmfxstate'
import { wirewasmmainchain } from '../wasm/wasmmainchain'
import {
  WASM_DEFAULT_PLAY_VOLUME,
  WASM_DEFAULT_TTS_VOLUME,
  initwasmmainsab,
  pushwasmmainsab,
} from '../wasm/wasmmainsab'

import { DAISY_BUILD_ID } from './daisybuildid'
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
let daisykeepalive: MAYBE<ConstantSourceNode>

let daisyplayvolume = WASM_DEFAULT_PLAY_VOLUME
let daisybgplayvolume = 100
let daisyttsvolume = WASM_DEFAULT_TTS_VOLUME
let daisybootedbuildid = ''

function teardowndaisyengine() {
  try {
    daisykeepalive?.stop()
    daisykeepalive?.disconnect()
  } catch {
    //
  }
  daisykeepalive = undefined
  try {
    daisyttssource?.stop()
  } catch {
    //
  }
  daisyttssource = undefined
  if (daisyengine) {
    try {
      daisyengine.audioWorkletNode.disconnect()
    } catch {
      //
    }
  }
  daisyengine = undefined
  daisyready = false
  daisyloadinflight = undefined
  daisybootedbuildid = ''
}

function pushdaisymainvolumes(maxi: DaisyEngine) {
  pushwasmmainsab(maxi, [
    daisyplayvolume,
    daisybgplayvolume,
    daisyttsvolume,
    0,
  ])
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
  if (isofflineaudiocontext(maxi.audioContext)) {
    maxi.audioWorkletNode.connect(maxi.audioContext.destination)
    return
  }
  wirewasmmainchain(audiocontext(maxi), maxi.audioWorkletNode)
  wirebroadcasttap(maxi)
}

function audiocontext(maxi: DaisyEngine): AudioContext {
  return asaudiocontext(maxi.audioContext)
}

function waitforaudiorunning(ctx: AudioContext) {
  if (ctx.state === 'running') {
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      ctx.removeEventListener('statechange', onstatechange)
      reject(
        new Error(
          `audio context not running (${ctx.state}) — interact with the page to unlock audio`,
        ),
      )
    }, 3000)

    function onstatechange() {
      if (ctx.state === 'running') {
        clearTimeout(timer)
        ctx.removeEventListener('statechange', onstatechange)
        resolve()
      }
    }

    ctx.addEventListener('statechange', onstatechange)
    void ctx.resume().catch((err: unknown) => {
      clearTimeout(timer)
      ctx.removeEventListener('statechange', onstatechange)
      reject(err instanceof Error ? err : new Error(String(err)))
    })
  })
}

function waitfornextframe() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
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
      port.onmessage = null
      port.onmessageerror = null
    }

    const timer = setTimeout(() => {
      cleanup()
      reject(
        new Error(`daisy wasm dsp boot timed out (last stage: ${laststage})`),
      )
    }, timeoutms)

    port.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        zss_dsp_ready?: number
        zss_dsp_error?: string
        zss_dsp_stage?: string
        zss_razzle_tag?: number
      }
      if (data?.zss_dsp_stage) {
        laststage = data.zss_dsp_stage
        if (import.meta.env.DEV) {
          console.warn('[daisy boot]', data.zss_dsp_stage)
        }
        return
      }
      if (data?.zss_dsp_ready) {
        if (import.meta.env.DEV) {
          console.warn('[daisy boot]', {
            buildid: DAISY_BUILD_ID,
            razzletag: data.zss_razzle_tag,
            expect: 'razzletag === 2',
          })
          if (data.zss_razzle_tag !== 2) {
            console.error(
              '[daisy boot] stale wasm — run yarn build:daisy then hard refresh',
            )
          }
        }
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
  await waitforaudiorunning(live)
}

function wireworkletkeepalive(ctx: AudioContext, worklet: AudioWorkletNode) {
  daisykeepalive?.stop()
  daisykeepalive?.disconnect()
  const keepalive = ctx.createConstantSource()
  keepalive.offset.value = 0
  keepalive.connect(worklet, 0, 0)
  keepalive.start()
  daisykeepalive = keepalive
}

function wiredevmeters(worklet: AudioWorkletNode) {
  if (!import.meta.env.DEV) {
    return
  }
  worklet.port.onmessage = (event: MessageEvent) => {
    const data = event.data as {
      zss_dsp_meter?: {
        compgrdb: number
        duck: number
        drypeak: number
      }
    }
    if (data?.zss_dsp_meter) {
      console.warn('[daisy meter]', data.zss_dsp_meter)
    }
  }
}

async function bootdaisyoncontext(ctx: BaseAudioContext): Promise<DaisyEngine> {
  await ensurewasmcoep()
  const wasmurl = daisyasseturl('zss_daisy.wasm')
  const processorurl = daisyasseturl('daisy-processor.js')
  if (import.meta.env.DEV) {
    console.warn('[daisy boot] fetching', {
      wasmurl,
      processorurl,
      buildid: DAISY_BUILD_ID,
    })
  }
  await ctx.audioWorklet.addModule(processorurl)

  const wasmresponse = await fetch(wasmurl, { cache: 'no-store' })
  if (!wasmresponse.ok) {
    throw new Error(`failed to fetch ${wasmurl}`)
  }
  const wasmbytes = await wasmresponse.arrayBuffer()
  await WebAssembly.compile(wasmbytes)

  await resumecontext(ctx)

  const worklet = new AudioWorkletNode(ctx, 'zss-daisy-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  })
  worklet.channelCount = 1
  worklet.channelCountMode = 'explicit'
  worklet.channelInterpretation = 'speakers'

  if (!isofflineaudiocontext(ctx)) {
    const live = asaudiocontext(ctx)
    wirewasmmainchain(live, worklet)
    wireworkletkeepalive(live, worklet)
  } else {
    worklet.connect(ctx.destination)
  }

  let rejectprocessor: (err: Error) => void
  const processorfail = new Promise<void>((_, reject) => {
    rejectprocessor = reject
  })
  worklet.onprocessorerror = () => {
    rejectprocessor(new Error('daisy worklet processor error'))
  }

  await waitfornextframe()

  const bootbytes = wasmbytes.slice(0)
  const ready = Promise.race([waitfordaisyready(worklet), processorfail])
  worklet.port.postMessage({ zss_boot: 1, wasmbytes: bootbytes }, [bootbytes])
  await ready
  wiredevmeters(worklet)

  const engine: DaisyEngine = {
    audioContext: ctx,
    audioWorkletNode: worklet,
  }
  wireoutput(engine)
  initwasmmainsab(engine, daisyplayvolume, daisybgplayvolume, daisyttsvolume)
  initwasmfxsab(engine)
  daisybootedbuildid = DAISY_BUILD_ID
  return engine
}

export async function bootisolateddaisyengine(
  ctx: BaseAudioContext,
): Promise<DaisyEngine> {
  return bootdaisyoncontext(ctx)
}

export async function ensuredaisysynthwasm(): Promise<DaisyEngine> {
  if (daisyengine && daisyready && daisybootedbuildid === DAISY_BUILD_ID) {
    return daisyengine
  }
  if (daisyengine && daisybootedbuildid !== DAISY_BUILD_ID) {
    teardowndaisyengine()
  }

  daisyloadinflight ??= (async () => {
    try {
      const ctx = getunlockedaudiocontext() ?? new AudioContext()
      await resumecontext(ctx)
      const engine = await bootdaisyoncontext(ctx)
      daisyengine = engine
      setliveaudiocontext(asaudiocontext(engine.audioContext))
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
  initwasmmainsab(engine, playvolume, bgplayvolume, ttsvolume)
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
    pushdaisymainvolumes(engine)
  }
}

export function setdaisysynthbgplayvolume(volume: number) {
  daisybgplayvolume = volume
  const engine = daisyengine
  if (engine) {
    pushdaisymainvolumes(engine)
  }
}

export function setdaisysynthttsvolume(volume: number) {
  daisyttsvolume = volume
  const engine = daisyengine
  if (engine) {
    pushdaisymainvolumes(engine)
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

export { initwasmmainsab } from '../wasm/wasmmainsab'
