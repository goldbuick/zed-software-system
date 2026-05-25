import { Note } from 'tonal'
import {
  invokeplay,
  parseplay,
  SYNTH_SFX_RESET,
  tonenotationseconds,
} from 'zss/feature/synth/playnotation'
import { SYNTH_VOICE_COUNT } from 'zss/feature/synth/synthdefaults'
import { SOURCE_TYPE } from 'zss/feature/synth/source'
import type { SYNTH_STATE } from 'zss/gadget/data/types'
import { randominteger } from 'zss/mapping/number'
import { isnumber, isstring } from 'zss/mapping/types'

import type { MaxiEngine } from './maximilian'
import { pushwasmsabvalues } from './sabpush'
import { resolveplaystarttime } from './playstart'
import {
  applywasmfxconfig,
  defaultwasmfxsab,
  initwasmfxsab,
  pushwasmfxsab,
  replaywasmfxfromstate,
  WASM_FX_PARAM_IDX,
  WASM_FX_PARAM_OFFSET,
} from './wasmfxstate'
import { canonicalvoicefxgroupindex } from '../voicefxgroup'
import {
  applywasmvoiceconfig,
  defaultwasmvoicestate,
  type WASM_VOICE_STATE,
  wasmvoicestatetosab,
} from './wasmvoiceconfig'
import {
  initwasmvoicecfgsab,
  pushwasmvoicecfgsab,
} from './wasmvoicecfgsab'

const WASM_VOICE_COUNT = SYNTH_VOICE_COUNT
const WASM_VOICES_SAB = 'zss_voices'
const WASM_DRUMS_SAB = 'zss_drums'
const WASM_DRUM_COUNT = 10
const WASM_DRUM_SAB_LEN = WASM_DRUM_COUNT * 2
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
  const voicecfg = defaultwasmvoicestate()
  const playstate = new Array(WASM_VOICE_BLOCK).fill(0)
  const sab = wasmvoicestatetosab(
    voicecfg,
    playstate,
    WASM_VOICE_STRIDE,
  )
  pushwasmsabvalues(maxi, WASM_VOICES_SAB, sab)
  initwasmvoicecfgsab(maxi, voicecfg)
}

export { initwasmfxsab } from './wasmfxstate'

function drumdurationfor(drumid: number, notationdur: number): number {
  if (drumid === 0) {
    return tonenotationseconds('16n')
  }
  if (drumid === 1) {
    return tonenotationseconds('8n')
  }
  if (drumid === 9) {
    return tonenotationseconds('8n')
  }
  return notationdur
}

export function initwasmdrumsab(maxi: MaxiEngine, strikes?: number[]) {
  pushwasmsabvalues(
    maxi,
    WASM_DRUMS_SAB,
    strikes ?? new Array(WASM_DRUM_SAB_LEN).fill(0),
  )
}

export type WASM_SYNTH_HOOKS = {
  setplayvolume?: (volume: number) => void
  setbgplayvolume?: (volume: number) => void
}

export function createwasmsynth(
  maxi: MaxiEngine,
  hooks: WASM_SYNTH_HOOKS = {},
) {
  initwasmvoicesab(maxi)
  initwasmfxsab(maxi)
  initwasmdrumsab(maxi)

  let voicestate = new Array(WASM_VOICE_BLOCK).fill(0)
  let fxsab = defaultwasmfxsab()
  let drumstrikes = new Array(WASM_DRUM_COUNT).fill(0)
  let drumdursec = new Array(WASM_DRUM_COUNT).fill(0)
  let voicecfg = defaultwasmvoicestate()
  let pacertime = -1
  let bgplayindex = SYNTH_SFX_RESET
  let playvolume = 80
  let bgplayvolume = 100
  const timeouts = new Set<ReturnType<typeof setTimeout>>()

  function pushfxstate() {
    pushwasmfxsab(maxi, fxsab)
  }

  function pushvoicestate() {
    voicestate = wasmvoicestatetosab(voicecfg, voicestate, WASM_VOICE_STRIDE)
    pushwasmsabvalues(maxi, WASM_VOICES_SAB, voicestate)
    pushwasmvoicecfgsab(maxi, voicecfg)
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
    pushwasmsabvalues(maxi, WASM_DRUMS_SAB, [
      ...drumstrikes,
      ...drumdursec,
    ])
  }

  function firedrum(drumid: number, dursec = 0) {
    drumdursec[drumid] = dursec
    drumstrikes[drumid]++
    pushdrumstate()
  }

  function warmdrums() {
    for (let i = 0; i < WASM_DRUM_COUNT; i++) {
      drumstrikes[i]++
    }
    pushdrumstate()
  }

  function scheduledrum(when: number, drumid: number, dursec: number) {
    if (drumid < 0 || drumid >= WASM_DRUM_COUNT) {
      return
    }
    const now = maxi.audioContext.currentTime
    const startms = Math.max(0, (when - now) * 1000)
    if (startms <= 2) {
      firedrum(drumid, dursec)
      return
    }
    armtimeout(() => {
      firedrum(drumid, dursec)
    }, startms)
  }

  function setvibratoparams(depth: number, freq: number) {
    fxsab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.VIBRATO_DEPTH] = depth
    fxsab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.VIBRATO_FREQ] = freq
    pushfxstate()
  }

  function schedulevibratodepth(when: number, durationsec: number) {
    const peakdepth = Math.min(1, durationsec / 1.2)
    const freqhigh = 1 + peakdepth * 4
    const rampreset = Math.min(0.35, durationsec * 0.48)
    const attackportion = Math.min(durationsec * 0.35, 0.35, durationsec * 0.48)
    const tend = when + durationsec
    const trelease = Math.max(when + rampreset, tend - rampreset)
    const tpeak = Math.min(when + attackportion, trelease)
    const now = maxi.audioContext.currentTime

    armtimeout(
      () => {
        setvibratoparams(0, 1)
      },
      Math.max(0, (when - now) * 1000),
    )
    armtimeout(
      () => {
        setvibratoparams(peakdepth, freqhigh)
      },
      Math.max(0, (tpeak - now) * 1000),
    )
    armtimeout(
      () => {
        setvibratoparams(peakdepth, freqhigh)
      },
      Math.max(0, (trelease - now) * 1000),
    )
    armtimeout(
      () => {
        setvibratoparams(0, 1)
      },
      Math.max(0, (tend - now) * 1000),
    )
  }

  function schedulenote(
    chan: number,
    when: number,
    pitch: string,
    durationsec: number,
  ) {
    if (chan < 0 || chan >= WASM_VOICE_COUNT) {
      return
    }
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

    schedulevibratodepth(when, durationsec)

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
          scheduledrum(
            time,
            note,
            drumdurationfor(note, tonenotationseconds(notation)),
          )
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

  function setbgplayvolume(volume: number) {
    bgplayvolume = volume
    hooks.setbgplayvolume?.(volume)
  }

  function setttsvolume(_volume: number) {
    // tts path uses playwasmaudiobuffer gain in maximilian.ts
  }

  function applyvoicefx(
    index: number,
    fxname: string,
    config: number | string,
    value: number | string,
  ) {
    const group = canonicalvoicefxgroupindex(index)
    if (applywasmfxconfig(fxsab, group, fxname, config, value)) {
      pushfxstate()
    }
  }

  function replayvoicefx(voicefx: SYNTH_STATE['voicefx']) {
    if (Object.keys(voicefx).length === 0) {
      return
    }
    replaywasmfxfromstate(fxsab, voicefx)
    pushfxstate()
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
    fxsab = defaultwasmfxsab()
    pushvoicestate()
    pushfxstate()
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
    applyvoicefx,
    replayvoicefx,
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
