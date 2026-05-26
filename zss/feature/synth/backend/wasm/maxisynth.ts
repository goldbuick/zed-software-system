import { Note } from 'tonal'
import {
  type SYNTH_NOTE_ENTRY,
  type SYNTH_NOTE_ON,
  SYNTH_SFX_RESET,
  invokeplay,
  parseplay,
  tonenotationseconds,
} from 'zss/feature/synth/playnotation'
import { SOURCE_TYPE } from 'zss/feature/synth/shared/sourcetype'
import {
  SYNTH_PLAY_VOICE_COUNT,
  SYNTH_VOICE_COUNT,
} from 'zss/feature/synth/synthdefaults'
import type { SYNTH_STATE } from 'zss/gadget/data/types'
import { randominteger } from 'zss/mapping/number'
import { isnumber, isstring } from 'zss/mapping/types'

import type { RECORDING_STATE } from '../../shared/recording'
import { synthdebugtrace } from '../../synthdebugtrace'
import {
  canonicalvoicefxgroupindex,
  voiceindexfxgroup,
} from '../../voicefxgroup'

import type { MaxiEngine } from './maximilian'
import { playpatternendtime } from './playstart'
import { pushwasmsabvalues } from './sabpush'
import {
  defaultwasmalgoconfig,
  initwasmalgoconfigsab,
  pushwasmalgoconfigsab,
} from './wasmalgoconfigsab'
import {
  WASM_FX_PARAM_IDX,
  applywasmfxconfig,
  defaultwasmfxsab,
  initwasmfxsab,
  pushwasmfxsab,
  replaywasmfxfromstate,
  wasmfxgroupparambase,
} from './wasmfxstate'
import {
  defaultwasmoscconfig,
  initwasmoscconfigsab,
  pushwasmoscconfigsab,
} from './wasmoscconfigsab'
import { createwasmplayscheduler } from './wasmplayscheduler'
import type { WASM_RECORD_DEPS } from './wasmrecordhandler'
import { type WASM_REPLAY_STATE, clonewasmreplaystate } from './wasmreplaystate'
import { initwasmvoicecfgsab, pushwasmvoicecfgsab } from './wasmvoicecfgsab'
import {
  type WASM_VOICE_STATE,
  applywasmvoiceconfig,
  defaultwasmvoicestate,
  wasmvoicestatetosab,
} from './wasmvoiceconfig'

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

export function initwasmvoicesab(maxi: MaxiEngine) {
  const voicecfg = defaultwasmvoicestate()
  const playstate = new Array(WASM_VOICE_BLOCK).fill(0)
  const sab = wasmvoicestatetosab(voicecfg, playstate, WASM_VOICE_STRIDE)
  pushwasmsabvalues(maxi, WASM_VOICES_SAB, sab)
  initwasmvoicecfgsab(maxi, voicecfg)
  initwasmoscconfigsab(maxi)
  initwasmalgoconfigsab(maxi)
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
  setttsvolume?: (volume: number) => void
}

export type WASM_RECORD_FACTORY = (
  maxi: MaxiEngine,
  recording: RECORDING_STATE,
  deps: WASM_RECORD_DEPS,
) => {
  synthrecord: (filename: string) => void
  synthflush: () => void
}

export function createwasmsynth(
  maxi: MaxiEngine,
  hooks: WASM_SYNTH_HOOKS = {},
  recordfactory?: WASM_RECORD_FACTORY,
) {
  initwasmvoicesab(maxi)
  initwasmfxsab(maxi)
  initwasmdrumsab(maxi)

  let voicestate = new Array(WASM_VOICE_BLOCK).fill(0)
  let fxsab = defaultwasmfxsab()
  const drumstrikes = new Array(WASM_DRUM_COUNT).fill(0)
  const drumdursec = new Array(WASM_DRUM_COUNT).fill(0)
  let voicecfg = defaultwasmvoicestate()
  let oscconfig = defaultwasmoscconfig()
  let algoconfig = defaultwasmalgoconfig()
  let pacertime = -1
  let pacercount = 0
  let bgplayindex = SYNTH_SFX_RESET
  let playvolume = 80
  let bgplayvolume = 100
  const recording: RECORDING_STATE = {
    recordedticks: [],
    recordlastpercent: 0,
    recordisrendering: 0,
  }
  const scheduler = createwasmplayscheduler(maxi)

  function pushfxstate() {
    pushwasmfxsab(maxi, fxsab)
  }

  function pushplayvoicestate() {
    voicestate = wasmvoicestatetosab(voicecfg, voicestate, WASM_VOICE_STRIDE)
    pushwasmsabvalues(maxi, WASM_VOICES_SAB, voicestate)
  }

  function pushvoicestate() {
    pushplayvoicestate()
    pushwasmvoicecfgsab(maxi, voicecfg)
    pushwasmoscconfigsab(maxi, oscconfig)
    pushwasmalgoconfigsab(maxi, algoconfig)
  }

  let rendertickhook: ((time: number) => void) | undefined

  function recordpattern(pattern: ReturnType<typeof invokeplay>) {
    if (recording.recordisrendering > 0) {
      return
    }
    for (let p = 0; p < pattern.length; ++p) {
      const entry = pattern[p]
      recording.recordedticks.push([entry[0], entry[1]])
    }
  }

  function notifyrendertick(time: number) {
    rendertickhook?.(time)
  }

  function scheduleplaytick(
    chan: number,
    time: number,
    notation: string,
    note: SYNTH_NOTE_ON[2],
    replayoffset = 0,
  ) {
    const when = replayoffset + time
    if (recording.recordisrendering > 0 && rendertickhook) {
      scheduler.schedule(when, () => {
        notifyrendertick(time)
      })
    }

    if (isnumber(note)) {
      if (note === -1) {
        scheduler.schedule(when, () => {
          if (recording.recordisrendering <= 0) {
            pacercount--
            if (pacercount <= 0) {
              pacercount = 0
              pacertime = -1
            }
          }
        })
        return
      }
      if (note >= 0 && note <= 9) {
        scheduledrum(
          when,
          note,
          drumdurationfor(note, tonenotationseconds(notation)),
        )
      }
      return
    }
    if (!isstring(note)) {
      return
    }
    if (note.startsWith('#')) {
      return
    }
    schedulenote(chan, when, note, tonenotationseconds(notation))
  }

  function getreplay(): WASM_REPLAY_STATE {
    return clonewasmreplaystate({
      voicecfg: voicecfg.map((item) => ({
        ...item,
        envelope: { ...item.envelope },
      })),
      oscconfig: oscconfig.map((item) => ({
        ...item,
        partials: [...item.partials],
        modenv: { ...item.modenv },
      })),
      algoconfig: algoconfig.map((item) => ({
        ...item,
        env1: { ...item.env1 },
        env2: { ...item.env2 },
        env3: { ...item.env3 },
        env4: { ...item.env4 },
      })),
      fxsab: fxsab.slice(),
      playvolume,
      bgplayvolume,
    })
  }

  function applyreplay(state: WASM_REPLAY_STATE) {
    voicecfg = state.voicecfg.map((item) => ({
      ...item,
      envelope: { ...item.envelope },
    }))
    oscconfig = state.oscconfig.map((item) => ({
      ...item,
      partials: [...item.partials],
      modenv: { ...item.modenv },
    }))
    algoconfig = state.algoconfig.map((item) => ({
      ...item,
      env1: { ...item.env1 },
      env2: { ...item.env2 },
      env3: { ...item.env3 },
      env4: { ...item.env4 },
    }))
    fxsab = state.fxsab.slice()
    pushvoicestate()
    pushfxstate()
  }

  function synthreplay(
    pattern: SYNTH_NOTE_ENTRY[],
    maxtime: number,
    tickhook?: (time: number) => void,
  ) {
    recording.recordlastpercent = 0
    recording.recordisrendering = maxtime
    rendertickhook = tickhook
    clearschedules()
    pacertime = -1
    pacercount = 0
    const replayoffset = maxi.audioContext.currentTime + 0.05
    for (let p = 0; p < pattern.length; ++p) {
      const [time, value] = pattern[p]
      const [chan, notation, note] = value
      scheduleplaytick(chan, time, notation, note, replayoffset)
    }
  }

  function clearschedules() {
    scheduler.clear()
    pacercount = 0
    for (let i = 0; i < WASM_VOICE_COUNT; i++) {
      const base = i * WASM_VOICE_STRIDE
      voicestate[base] = 0
      voicestate[base + 1] = 0
      voicestate[base + 4] = 0
    }
    synthdebugtrace('C7 clearschedules gates', {
      playgates: [voicestate[1], voicestate[7], voicestate[13], voicestate[19]],
    })
    pushplayvoicestate()
  }

  function pushdrumstate() {
    pushwasmsabvalues(maxi, WASM_DRUMS_SAB, [...drumstrikes, ...drumdursec])
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
    scheduler.schedule(when, () => {
      firedrum(drumid, dursec)
    })
  }

  function setvibratoparams(group: number, depth: number, freq: number) {
    const parambase = wasmfxgroupparambase(group)
    fxsab[parambase + WASM_FX_PARAM_IDX.VIBRATO_DEPTH] = depth
    fxsab[parambase + WASM_FX_PARAM_IDX.VIBRATO_FREQ] = freq
    pushfxstate()
  }

  function schedulevibratodepth(
    chan: number,
    when: number,
    durationsec: number,
  ) {
    const group = voiceindexfxgroup(chan)
    const peakdepth = Math.min(1, durationsec / 1.2)
    const freqhigh = 1 + peakdepth * 4
    const rampreset = Math.min(0.35, durationsec * 0.48)
    const attackportion = Math.min(durationsec * 0.35, 0.35, durationsec * 0.48)
    const tend = when + durationsec
    const trelease = Math.max(when + rampreset, tend - rampreset)
    const tpeak = Math.min(when + attackportion, trelease)

    scheduler.schedule(when, () => {
      setvibratoparams(group, 0, 1)
    })
    scheduler.schedule(tpeak, () => {
      setvibratoparams(group, peakdepth, freqhigh)
    })
    scheduler.schedule(trelease, () => {
      setvibratoparams(group, peakdepth, freqhigh)
    })
    scheduler.schedule(tend, () => {
      setvibratoparams(group, 0, 1)
    })
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
    const endwhen = when + durationsec
    const freq = notetofrequency(pitch)
    const base = chan * WASM_VOICE_STRIDE
    const detune =
      voicecfg[chan]?.type === SOURCE_TYPE.BELLS ? randominteger(-3, 3) : 0

    scheduler.schedule(when, () => {
      voicestate[base] = freq
      voicestate[base + 1] = 1
      voicestate[base + 4] = detune
      pushplayvoicestate()
    })

    schedulevibratodepth(chan, when, durationsec)

    scheduler.schedule(endwhen, () => {
      voicestate[base + 1] = 0
      pushplayvoicestate()
    })
  }

  function synthplaystart(
    idx: number,
    starttime: number,
    invoke: Parameters<typeof invokeplay>[2],
    withendofpattern = true,
  ) {
    const pattern = invokeplay(idx, starttime, invoke, withendofpattern)
    recordpattern(pattern)

    for (let p = 0; p < pattern.length; ++p) {
      const [time, value] = pattern[p]
      const [chan, notation, note] = value
      scheduleplaytick(chan, time, notation, note)
    }

    return playpatternendtime(pattern, starttime)
  }

  function addplay(buffer: string) {
    const invokes = parseplay(buffer)
    const now = maxi.audioContext.currentTime
    if (pacertime === -1) {
      pacertime = now
    }
    pacercount += invokes.length
    const starttime = pacertime
    for (let i = 0; i < invokes.length && i < SYNTH_PLAY_VOICE_COUNT; ++i) {
      pacertime = Math.max(pacertime, synthplaystart(i, starttime, invokes[i]))
    }
  }

  function addbgplay(buffer: string, quantize: string) {
    const invokes = parseplay(buffer)
    const starttime =
      maxi.audioContext.currentTime + quantizetoseconds(quantize)
    for (let i = 0; i < invokes.length; ++i) {
      synthplaystart(bgplayindex++, starttime, invokes[i], false)
      if (bgplayindex >= WASM_VOICE_COUNT) {
        bgplayindex = SYNTH_SFX_RESET
      }
    }
  }

  function stopplay() {
    synthdebugtrace('C6 stopplay')
    clearschedules()
    pacertime = -1
    pacercount = 0
  }

  function setplayvolume(volume: number) {
    playvolume = volume
    hooks.setplayvolume?.(volume)
  }

  function setbgplayvolume(volume: number) {
    bgplayvolume = volume
    hooks.setbgplayvolume?.(volume)
  }

  function setttsvolume(volume: number) {
    hooks.setttsvolume?.(volume)
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
    replaywasmfxfromstate(fxsab, voicefx ?? {})
    pushfxstate()
  }

  function setvoiceconfig(
    index: number,
    config: number | string,
    value: number | string | number[],
  ) {
    const isrestart = config === 'restart'
    if (
      applywasmvoiceconfig(
        voicecfg,
        oscconfig,
        algoconfig,
        index,
        config,
        value,
      )
    ) {
      if (isrestart) {
        fxsab = defaultwasmfxsab()
        pushfxstate()
      }
      pushvoicestate()
    }
  }

  function applyreset() {
    voicecfg = defaultwasmvoicestate()
    oscconfig = defaultwasmoscconfig()
    algoconfig = defaultwasmalgoconfig()
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

  function defaultrecordflush() {
    recording.recordedticks = []
    recording.recordlastpercent = 0
    recording.recordisrendering = 0
  }

  const recordapi = recordfactory?.(maxi, recording, {
    clearschedules,
    applyreplay,
    synthreplay,
    setplayvolume,
    setbgplayvolume,
    getreplay,
  }) ?? {
    synthrecord: () => {},
    synthflush: defaultrecordflush,
  }

  const { synthrecord, synthflush } = recordapi

  function prepareofflinerender() {
    scheduler.armofflinerender()
  }

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
    synthrecord,
    synthflush,
    synthreplay,
    prepareofflinerender,
    applyreplay,
    getreplay,
    destroy: () => {
      clearschedules()
    },
  }
}

export type WASM_SYNTH = ReturnType<typeof createwasmsynth>
