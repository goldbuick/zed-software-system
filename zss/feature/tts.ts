import { newQueue } from '@henrygd/queue'
import { createdevice } from 'zss/device'
import {
  apilog,
  apierror,
  registerstore,
  ttsinfo as emitttsinfo,
  ttsrequest as emitttsrequest,
  synthaudiobuffer,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  getliveaudiocontext,
  unlockaudiocontext,
} from 'zss/feature/synth/backend/wasm/audiocontextunlock'
import {
  FISH_DEFAULT_MODEL,
  describefishconfig,
  maskfishapikey,
  normalizemodel,
  requestfishaudiobytes,
} from 'zss/feature/fishaudio'
import { storagereadconfigstring } from 'zss/feature/storage'
import { createsid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'

export type TTS_ENGINE = 'piper' | 'supertonic' | 'fish'

const FISH_VOICE_HELP =
  'fish voice = reference_id from fish.audio (use as #tts <id> <phrase>)'
const FISH_MODEL_HELP =
  'fish models: s2.1-pro-free (default), s2.1-pro, s2-pro, s1 — #ttsengine fish <key> [model]'

export function readttsenginestatuslines(): string[] {
  if (ttsengine === 'fish') {
    return [
      `ttsengine fish model=${ttsfishmodel}`,
      `api_key=${maskfishapikey(ttsconfig)}`,
    ]
  }
  if (ttsconfig.trim() !== '') {
    return [`ttsengine ${ttsengine} config=${ttsconfig}`]
  }
  return [`ttsengine ${ttsengine}`]
}

async function fishconfiginfowithvalidate(): Promise<string[]> {
  const lines = readttsenginestatuslines()
  if (!ttsconfig.trim()) {
    lines.push('fish tts config: set api key with #ttsengine fish <key> [model]')
    return lines
  }
  const result = describefishconfig(ttsconfig, ttsfishmodel)
  if (result.ok) {
    lines.push(...result.lines)
  } else {
    lines.push(`fish tts validate>> ${result.errormsg}`)
  }
  return lines
}

// engine config
let ttsengine: TTS_ENGINE = 'piper'
let ttsconfig = ''
let ttsfishmodel = FISH_DEFAULT_MODEL

function normalizettsengine(engine: string): TTS_ENGINE {
  if (engine === 'supertonic' || engine === 'fish') {
    return engine
  }
  return 'piper'
}

export function selectttsengine(engine: string, config: string, model?: string) {
  ttsengine = normalizettsengine(engine)
  if (config.trim() !== '') {
    ttsconfig = config
  }
  if (ttsengine === 'fish' && typeof model === 'string' && model.trim() !== '') {
    ttsfishmodel = normalizemodel(model)
  }
}

export function storettsengineconfig(
  player: string,
  engine: string,
  config: string,
  model?: string,
) {
  registerstore(SOFTWARE, player, 'config_ttsengine', engine)
  if (config.trim() !== '') {
    registerstore(SOFTWARE, player, 'config_ttsengineconfig', config)
  }
  if (engine === 'fish') {
    const modelval =
      typeof model === 'string' && model.trim() !== ''
        ? normalizemodel(model)
        : ttsfishmodel
    registerstore(SOFTWARE, player, 'config_ttsenginemodel', modelval)
  }
}

export async function applyttsengineconfig(
  player: string,
  engine: string,
  config: string,
  model?: string,
): Promise<string[]> {
  const normalized = normalizettsengine(engine)
  const haskey = config.trim() !== ''

  if (normalized === 'fish' && !haskey) {
    const lines = readttsenginestatuslines()
    if (ttsconfig.trim()) {
      const result = describefishconfig(ttsconfig, ttsfishmodel)
      if (result.ok) {
        lines.push(...result.lines)
      } else {
        apierror(SOFTWARE, player, 'fish tts config', result.errormsg)
      }
    }
    return lines
  }

  const effectivemodel =
    normalized === 'fish' && haskey && (!model || model.trim() === '')
      ? FISH_DEFAULT_MODEL
      : model

  selectttsengine(engine, config, effectivemodel)
  storettsengineconfig(
    player,
    engine,
    haskey ? config : ttsconfig,
    effectivemodel,
  )

  if (normalized === 'fish') {
    const key = haskey ? config : ttsconfig
    const result = describefishconfig(key, ttsfishmodel)
    if (!result.ok) {
      apierror(SOFTWARE, player, 'fish tts config', result.errormsg)
    }
    return []
  }

  apilog(SOFTWARE, player, `ttsengine ${ttsengine} ready`)
  return []
}

export async function restorettsenginefromstorage() {
  const engine = await storagereadconfigstring('ttsengine')
  if (!engine) {
    return
  }
  const config = (await storagereadconfigstring('ttsengineconfig')) ?? ''
  selectttsengine(engine, config)
  const model = await storagereadconfigstring('ttsenginemodel')
  if (model) {
    ttsfishmodel = normalizemodel(model)
  }
}

function getaudiocontext(): AudioContext {
  return getliveaudiocontext() ?? unlockaudiocontext()
}

function convertarraybytes(bytes: ArrayBuffer) {
  return getaudiocontext().decodeAudioData(bytes)
}

async function requestaudiobuffer(
  player: string,
  voice: string,
  input: string,
): Promise<MAYBE<AudioBuffer>> {
  if (ttsengine === 'fish') {
    if (!ttsconfig.trim()) {
      apierror(
        SOFTWARE,
        player,
        'fish tts',
        'set api key with #ttsengine fish <key> [model]',
      )
      return undefined
    }
    const result = await requestfishaudiobytes(
      ttsconfig,
      voice,
      input,
      ttsfishmodel,
    )
    if (!result.ok) {
      apierror(SOFTWARE, player, 'fish tts', result.errormsg)
      return undefined
    }
    try {
      return await convertarraybytes(result.bytes)
    } catch (err) {
      apierror(
        SOFTWARE,
        player,
        'fish tts decode',
        err instanceof Error ? err.message : String(err),
      )
      return undefined
    }
  }
  return new Promise((resolve) => {
    const once = createdevice(
      createsid(),
      [],
      (message) => {
        if (message.target === 'tts:request' && message.data) {
          convertarraybytes(message.data).then(resolve).catch(console.error)
        }
        once.disconnect()
      },
      SOFTWARE.session(),
    )
    emitttsrequest(once, player, ttsengine, ttsconfig, voice, input)
  })
}

export function ttsinfo(player: string, info: string) {
  if (ttsengine === 'fish') {
    if (info === 'voices') {
      return Promise.resolve([FISH_VOICE_HELP, FISH_MODEL_HELP])
    }
    if (info === 'config') {
      return fishconfiginfowithvalidate()
    }
    return Promise.resolve([])
  }
  return new Promise((resolve) => {
    const once = createdevice(
      createsid(),
      [],
      (message) => {
        if (message.target === 'tts:info' && message.data) {
          resolve(message.data)
        }
        once.disconnect()
      },
      SOFTWARE.session(),
    )
    emitttsinfo(once, player, ttsengine, info)
  })
}

export async function ttsplay(
  player: string,
  board: string,
  voice: string,
  input: string,
): Promise<void> {
  if (input.trim() === '') {
    return
  }
  // play the audio
  const audiobuffer = await requestaudiobuffer(player, voice, input)
  if (ispresent(audiobuffer)) {
    synthaudiobuffer(SOFTWARE, player, board, audiobuffer)
  }
}

// audio playback queue
const audioplayqueue = newQueue(1)

async function audioplaytask(
  player: string,
  board: string,
  audiobuffer: AudioBuffer,
): Promise<void> {
  // play the audio
  synthaudiobuffer(SOFTWARE, player, board, audiobuffer)
  // wait audio duration before playing next audio
  const waittime = Math.max(1000, Math.round(audiobuffer.duration * 1000))
  await waitfor(waittime)
}

// audio buffer request queue
const audiobufferqueue = newQueue(1)

async function audiobuffertask(
  player: string,
  board: string,
  voice: string,
  input: string,
): Promise<void> {
  const audiobuffer = await requestaudiobuffer(player, voice, input)
  audioplayqueue
    .add(async () => {
      if (ispresent(audiobuffer)) {
        await audioplaytask(player, board, audiobuffer)
      }
    })
    .catch(console.error)
}

export function ttsqueue(
  player: string,
  board: string,
  voice: string,
  input: string,
) {
  audiobufferqueue
    .add(async () => {
      await audiobuffertask(player, board, voice, input)
    })
    .catch(console.error)
}

export function ttsclearqueue() {
  audioplayqueue.clear()
  audiobufferqueue.clear()
}
