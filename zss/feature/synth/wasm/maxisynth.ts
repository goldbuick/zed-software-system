import { Note } from 'tonal'
import {
  SYNTH_SFX_RESET,
  invokeplay,
  parseplay,
  tonenotationseconds,
} from 'zss/feature/synth/playnotation'
import { SOURCE_TYPE } from 'zss/feature/synth/source'
import { randominteger } from 'zss/mapping/number'
import { isnumber, isstring } from 'zss/mapping/types'

import type { MaxiEngine } from './maximilian'
import { pushwasmsabvalues } from './sabpush'
import { resolveplaystarttime } from './playstart'
import {
  applywasmvoiceconfig,
  defaultwasmvoicestate,
  type WASM_VOICE_STATE,
  wasmvoicestatetosab,
} from './wasmvoiceconfig'

const WASM_VOICE_COUNT = 4
const WASM_VOICES_SAB = 'zss_voices'
const WASM_DRUMS_SAB = 'zss_drums'
const WASM_DRUM_COUNT = 10
const WASM_SIDECHAIN_DRUMS = new Set([3, 9])
const WASM_VOICE_STRIDE = 6
const WASM_VOICE_BLOCK = WASM_VOICE_COUNT * WASM_VOICE_STRIDE

function notetofrequency(pitch: string): number {
  const freq = Note.freq(pitch)
  return isnumber(freq) && freq > 0 ? freq : 440
}

function quantizetoseconds(quantize: string): number {
  const trimmed = quantize.trim()
  if (trimmed === '') {
    return 0.05
  }
  if (trimmed.startsWith('+')) {
    const tail = trimmed.slice(1).trim()
    if (tail === '') {
      return 0.05
    }
    try {
      return tonenotationseconds(tail)
    } catch {
      return 0.05
    }
  }
  try {
    return tonenotationseconds(trimmed)
  } catch {
    return 0.05
  }
}

function patternendtime(
  starttime: number,
  pattern: ReturnType<typeof invokeplay>,
): number {
  let endtime = starttime
  for (let p = 0; p < pattern.length; ++p) {
    const [time, value] = pattern[p]
    const [, notation, note] = value
    if (note === null) {
      continue
    }
    if (isnumber(note)) {
      endtime = Math.max(endtime, time + tonenotationseconds(notation))
      continue
    }
    if (!isstring(note) || note.startsWith('#')) {
      continue
    }
    endtime = Math.max(endtime, time + tonenotationseconds(notation))
  }
  return endtime
}

export function initwasmvoicesab(maxi: MaxiEngine) {
  const playstate = new Array(WASM_VOICE_BLOCK).fill(0)
  const sab = wasmvoicestatetosab(
    defaultwasmvoicestate(),
    playstate,
    WASM_VOICE_STRIDE,
  )
  pushwasmsabvalues(maxi, WASM_VOICES_SAB, sab)
}

export function initwasmdrumsab(maxi: MaxiEngine, strikes?: number[]) {
  pushwasmsabvalues(
    maxi,
    WASM_DRUMS_SAB,
    strikes ?? new Array(WASM_DRUM_COUNT).fill(0),
  )
}

export type WASM_SYNTH_HOOKS = {
  setplayvolume?: (volume: number) => void
  ducksidechain?: (drumid: number) => void
}

export function createwasmsynth(
  maxi: MaxiEngine,
  hooks: WASM_SYNTH_HOOKS = {},
) {
  initwasmvoicesab(maxi)
  initwasmdrumsab(maxi)

  let voicestate = new Array(WASM_VOICE_BLOCK).fill(0)
  let drumstrikes = new Array(WASM_DRUM_COUNT).fill(0)
  let voicecfg = defaultwasmvoicestate()
  let pacertime = -1
  let bgplayindex = SYNTH_SFX_RESET
  let playvolume = 80
  let bgplayvolume = 100
  const timeouts = new Set<ReturnType<typeof setTimeout>>()

  function pushvoicestate() {
    voicestate = wasmvoicestatetosab(voicecfg, voicestate, WASM_VOICE_STRIDE)
    pushwasmsabvalues(maxi, WASM_VOICES_SAB, voicestate)
  }

  function clearschedules() {
    for (const timeout of timeouts) {
      clearTimeout(timeout)
    }
    timeouts.clear()
    for (let i = 0; i < WASM_VOICE_COUNT; i++) {
      const base = i * WASM_VOICE_STRIDE
      voicestate[base] = 0
      voicestate[base + 1] = 0
      voicestate[base + 4] = 0
    }
    pushvoicestate()
  }

  function armtimeout(callback: () => void, delayms: number) {
    const timeout = setTimeout(() => {
      timeouts.delete(timeout)
      callback()
    }, delayms)
    timeouts.add(timeout)
  }

  function pushdrumstate() {
    pushwasmsabvalues(maxi, WASM_DRUMS_SAB, drumstrikes)
  }

  function firedrum(drumid: number) {
    drumstrikes[drumid]++
    pushdrumstate()
    if (WASM_SIDECHAIN_DRUMS.has(drumid)) {
      hooks.ducksidechain?.(drumid)
    }
  }

  function warmdrums() {
    for (let i = 0; i < WASM_DRUM_COUNT; i++) {
      drumstrikes[i]++
    }
    pushdrumstate()
  }

  function scheduledrum(when: number, drumid: number) {
    if (drumid < 0 || drumid >= WASM_DRUM_COUNT) {
      return
    }
    const now = maxi.audioContext.currentTime
    const startms = Math.max(0, (when - now) * 1000)
    if (startms <= 2) {
      firedrum(drumid)
      return
    }
    armtimeout(() => {
      firedrum(drumid)
    }, startms)
  }

  function schedulenote(
    chan: number,
    when: number,
    pitch: string,
    durationsec: number,
  ) {
    const now = maxi.audioContext.currentTime
    const startms = Math.max(0, (when - now) * 1000)
    const endms = startms + durationsec * 1000
    const freq = notetofrequency(pitch)
    const base = chan * WASM_VOICE_STRIDE
    const detune =
      voicecfg[chan]?.type === SOURCE_TYPE.BELLS ? randominteger(-3, 3) : 0

    armtimeout(() => {
      voicestate[base] = freq
      voicestate[base + 1] = 1
      voicestate[base + 4] = detune
      pushvoicestate()
    }, startms)

    armtimeout(() => {
      voicestate[base + 1] = 0
      pushvoicestate()
    }, endms)
  }

  function synthplaystart(
    idx: number,
    starttime: number,
    invoke: Parameters<typeof invokeplay>[2],
    withendofpattern = true,
  ) {
    const pattern = invokeplay(idx, starttime, invoke, withendofpattern)

    for (let p = 0; p < pattern.length; ++p) {
      const [time, value] = pattern[p]
      const [, notation, note] = value
      if (isnumber(note)) {
        if (note >= 0 && note <= 9) {
          scheduledrum(time, note)
        }
        continue
      }
      if (!isstring(note)) {
        continue
      }
      if (note.startsWith('#')) {
        continue
      }
      schedulenote(idx, time, note, tonenotationseconds(notation))
    }

    return patternendtime(starttime, pattern)
  }

  function addplay(buffer: string) {
    const invokes = parseplay(buffer)
    const now = maxi.audioContext.currentTime
    pacertime = resolveplaystarttime(pacertime, now)
    const starttime = pacertime
    for (let i = 0; i < invokes.length && i < WASM_VOICE_COUNT; ++i) {
      const endtime = synthplaystart(i, starttime, invokes[i])
      pacertime = Math.max(pacertime, endtime)
    }
  }

  function addbgplay(buffer: string, quantize: string) {
    const invokes = parseplay(buffer)
    const starttime = maxi.audioContext.currentTime + quantizetoseconds(quantize)
    for (let i = 0; i < invokes.length; ++i) {
      synthplaystart(bgplayindex++, starttime, invokes[i], false)
      if (bgplayindex >= WASM_VOICE_COUNT) {
        bgplayindex = SYNTH_SFX_RESET
      }
    }
  }

  function stopplay() {
    clearschedules()
    pacertime = -1
  }

  function setplayvolume(volume: number) {
    playvolume = volume
    hooks.setplayvolume?.(volume)
  }

  function setbgplayvolume(_volume: number) {
    bgplayvolume = _volume
  }

  function setttsvolume(_volume: number) {
    // tts path uses playwasmaudiobuffer gain in maximilian.ts
  }

  function setvoiceconfig(
    index: number,
    config: number | string,
    value: number | string | number[],
  ) {
    if (applywasmvoiceconfig(voicecfg, index, config, value)) {
      pushvoicestate()
    }
  }

  function applyreset() {
    voicecfg = defaultwasmvoicestate()
    pushvoicestate()
  }

  function getvoicecfg(): WASM_VOICE_STATE[] {
    return voicecfg.map((item) => ({ ...item }))
  }

  function resyncsabs() {
    initwasmvoicesab(maxi)
    pushvoicestate()
    pushdrumstate()
  }

  setplayvolume(80)
  setbgplayvolume(100)
  pushvoicestate()

  return {
    addplay,
    addbgplay,
    stopplay,
    setplayvolume,
    setbgplayvolume,
    setttsvolume,
    setvoiceconfig,
    applyreset,
    getvoicecfg,
    resyncsabs,
    warmdrums,
    getplayvolume: () => playvolume,
    getbgplayvolume: () => bgplayvolume,
    destroy: () => {
      clearschedules()
    },
  }
}

export type WASM_SYNTH = ReturnType<typeof createwasmsynth>
