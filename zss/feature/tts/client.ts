import { newQueue } from '@henrygd/queue'
import { createdevice } from 'zss/device'
import {
  apierror,
  apilog,
  ttsinfo as emitttsinfo,
  ttsrequest as emitttsrequest,
  registerstore,
  synthaudiobuffer,
} from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/messagetypes'
import { isttsvalidatereply } from 'zss/device/messagetypes'
import { SOFTWARE } from 'zss/device/session'
import { storagereadconfigstring } from 'zss/feature/storage'
import {
  getliveaudiocontext,
  unlockaudiocontext,
} from 'zss/feature/synth/backend/wasm/audiocontextunlock'
import { type TTS_ENGINE, normalizettsengine } from 'zss/feature/tts/engine'
import { createsid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'

// engine config
let ttsengine: TTS_ENGINE = 'piper'
let ttsconfig = ''
let ttsmodel = ''

async function awaitworkerreply<T>(
  _player: string,
  target: 'tts:request' | 'tts:info',
  emit: (device: DEVICELIKE) => void,
): Promise<T | undefined> {
  return new Promise((resolve) => {
    const once = createdevice(
      createsid(),
      [],
      (message) => {
        if (message.target === target) {
          resolve(message.data as T | undefined)
        }
        once.disconnect()
      },
      SOFTWARE.session(),
    )
    emit(once)
  })
}

function emitworkerrequest(
  device: DEVICELIKE,
  player: string,
  voice: string,
  phrase: string,
) {
  emitttsrequest(device, player, ttsengine, ttsconfig, voice, phrase, ttsmodel)
}

function emitworkerinfo(
  device: DEVICELIKE,
  player: string,
  info: string,
  config = ttsconfig,
  model = ttsmodel,
  engine: TTS_ENGINE = ttsengine,
) {
  emitttsinfo(device, player, engine, info, config, model)
}

async function reloadslotsfromstorage(player: string, engine: TTS_ENGINE) {
  const savedconfig = (await storagereadconfigstring('ttsengineconfig')) ?? ''
  const savedmodel = (await storagereadconfigstring('ttsenginemodel')) ?? ''
  if (!savedconfig.trim()) {
    return
  }
  const validated = await awaitworkerreply<unknown>(
    player,
    'tts:info',
    (once) =>
      emitworkerinfo(once, player, 'validate', savedconfig, savedmodel, engine),
  )
  if (isttsvalidatereply(validated) && validated.ok) {
    ttsconfig = savedconfig
    ttsmodel = validated.model || savedmodel
  }
}

export function selectttsengine(
  engine: string,
  config: string,
  model?: string,
) {
  ttsengine = normalizettsengine(engine)
  if (config.trim() !== '') {
    ttsconfig = config
  }
  if (typeof model === 'string' && model.trim() !== '') {
    ttsmodel = model.trim()
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
  const modelval =
    typeof model === 'string' && model.trim() !== '' ? model.trim() : ttsmodel
  if (modelval.trim() !== '') {
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
  const hasconfig = config.trim() !== ''

  if (!hasconfig) {
    const prevengine = ttsengine
    ttsengine = normalized
    registerstore(SOFTWARE, player, 'config_ttsengine', normalized)
    if (prevengine !== normalized) {
      ttsconfig = ''
      ttsmodel = ''
      await reloadslotsfromstorage(player, normalized)
    }
    const lines = await awaitworkerreply<string[]>(player, 'tts:info', (once) =>
      emitworkerinfo(once, player, 'config', ttsconfig, ttsmodel, normalized),
    )
    return isarraylines(lines) ? lines : []
  }

  const proposedmodel = typeof model === 'string' ? model : ''
  const validated = await awaitworkerreply<unknown>(
    player,
    'tts:info',
    (once) =>
      emitworkerinfo(
        once,
        player,
        'validate',
        config,
        proposedmodel,
        normalized,
      ),
  )

  if (!isttsvalidatereply(validated)) {
    apierror(SOFTWARE, player, 'tts config', 'validate failed')
    return []
  }
  if (!validated.ok) {
    apierror(SOFTWARE, player, 'tts config', validated.errormsg)
    return []
  }

  selectttsengine(normalized, config, validated.model)
  storettsengineconfig(player, normalized, config, validated.model)
  apilog(SOFTWARE, player, `ttsengine ${ttsengine} ready`)
  return []
}

function isarraylines(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((line) => typeof line === 'string')
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
    ttsmodel = model
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
  const bytes = await awaitworkerreply<ArrayBuffer>(
    player,
    'tts:request',
    (once) => emitworkerrequest(once, player, voice, input),
  )
  if (!ispresent(bytes)) {
    return undefined
  }
  try {
    return await convertarraybytes(bytes)
  } catch (err) {
    apierror(
      SOFTWARE,
      player,
      'tts decode',
      err instanceof Error ? err.message : String(err),
    )
    return undefined
  }
}

export function ttsinfo(player: string, info: string) {
  return awaitworkerreply<string[]>(player, 'tts:info', (once) =>
    emitworkerinfo(once, player, info),
  ).then((data) => {
    if (isarraylines(data)) {
      return data
    }
    return []
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
  synthaudiobuffer(SOFTWARE, player, board, audiobuffer)
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
