import { Note } from 'tonal'
import {
  invokeplay,
  parseplay,
  tonenotationseconds,
} from 'zss/feature/synth/playnotation'
import { SOURCE_TYPE } from 'zss/feature/synth/shared/sourcetype'
import {
  SYNTH_PLAY_VOICE_COUNT,
  SYNTH_VOICE_COUNT,
} from 'zss/feature/synth/synthdefaults'
import { voiceindexfxgroup } from 'zss/feature/synth/voicefxgroup'
import { randominteger } from 'zss/mapping/number'
import { isnumber, isstring } from 'zss/mapping/types'

import type { SabEngine } from '../../shared/sabengine'
import { playpatternendtime } from '../playstart'
import { initwasmsabchannels, pushwasmsabvalues } from '../sabpush'
import {
  defaultwasmalgoconfig,
  pushwasmalgoconfigsab,
} from '../wasmalgoconfigsab'
import { defaultwasmfxsab, initwasmfxsab, pushwasmfxsab } from '../wasmfxstate'
import { initwasmvoicesab } from '../wasminitsab'
import { defaultwasmoscconfig, pushwasmoscconfigsab } from '../wasmoscconfigsab'
import { createwasmplayscheduler } from '../wasmplayscheduler'
import {
  WASM_DRUMS_SAB,
  WASM_DRUM_COUNT,
  WASM_VOICES_SAB,
  WASM_VOICE_STRIDE,
} from '../wasmsabchannels'
import {
  defaultwasmvibratosab,
  initwasmvibratosab,
  pushwasmvibratogroup,
} from '../wasmvibratosab'
import { pushwasmvoicecfgsab } from '../wasmvoicecfgsab'
import {
  applywasmvoiceconfig,
  defaultwasmvoicestate,
  wasmvoicestatetosab,
} from '../wasmvoiceconfig'

const WASM_VOICE_BLOCK = SYNTH_VOICE_COUNT * WASM_VOICE_STRIDE

function notetofrequency(pitch: string): number {
  const freq = Note.freq(pitch)
  return isnumber(freq) && freq > 0 ? freq : 440
}

/** Minimal synth surface for SAB integration tests (no archived Maximilian backend). */
export function createminsabsynth(engine: SabEngine) {
  initwasmsabchannels(engine)
  initwasmvoicesab(engine)
  initwasmfxsab(engine)
  initwasmvibratosab(engine, engine.audioContext.currentTime)

  let voicestate = new Array(WASM_VOICE_BLOCK).fill(0)
  const voicecfg = defaultwasmvoicestate()
  const oscconfig = defaultwasmoscconfig()
  const algoconfig = defaultwasmalgoconfig()
  const fxsab = defaultwasmfxsab()
  const vibratosab = defaultwasmvibratosab(engine.audioContext.currentTime)
  const drumstrikes = new Array(WASM_DRUM_COUNT).fill(0)
  const drumdursec = new Array(WASM_DRUM_COUNT).fill(0)
  let pacertime = -1
  let pacercount = 0
  const scheduler = createwasmplayscheduler(engine)

  function pushplayvoicestate() {
    voicestate = wasmvoicestatetosab(voicecfg, voicestate, WASM_VOICE_STRIDE)
    pushwasmsabvalues(engine, WASM_VOICES_SAB, voicestate)
  }

  function pushcoldvoiceconfig() {
    pushwasmvoicecfgsab(engine, voicecfg)
    pushwasmoscconfigsab(engine, oscconfig)
    pushwasmalgoconfigsab(engine, algoconfig)
  }

  function pushdrumstate() {
    pushwasmsabvalues(engine, WASM_DRUMS_SAB, [...drumstrikes, ...drumdursec])
  }

  function scheduledrum(when: number, drumid: number, dursec: number) {
    scheduler.schedule(when, () => {
      drumdursec[drumid] = dursec
      drumstrikes[drumid]++
      pushdrumstate()
    })
  }

  function schedulenote(
    chan: number,
    when: number,
    pitch: string,
    durationsec: number,
  ) {
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
      pushwasmvibratogroup(
        engine,
        vibratosab,
        voiceindexfxgroup(chan),
        when,
        when + durationsec,
        Math.min(1, durationsec / 1.2),
        1 + Math.min(1, durationsec / 1.2) * 4,
      )
    })

    scheduler.schedule(endwhen, () => {
      voicestate[base + 1] = 0
      pushplayvoicestate()
    })
  }

  function scheduleplaytick(
    chan: number,
    time: number,
    notation: string,
    note: string | number | null,
    replayoffset = 0,
  ) {
    if (note === null) {
      return
    }
    const when = replayoffset + time
    if (isnumber(note)) {
      if (note === -1) {
        return
      }
      if (note >= 0 && note < WASM_DRUM_COUNT) {
        scheduledrum(when, note, tonenotationseconds(notation))
      }
      return
    }
    if (!isstring(note) || note.startsWith('#')) {
      return
    }
    schedulenote(chan, when, note, tonenotationseconds(notation))
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
      const [chan, notation, note] = value
      scheduleplaytick(chan, time, notation, note)
    }
    return playpatternendtime(pattern, starttime)
  }

  return {
    addplay(buffer: string) {
      const invokes = parseplay(buffer)
      const now = engine.audioContext.currentTime
      if (pacertime === -1) {
        pacertime = now
      }
      pacercount += invokes.length
      const starttime = pacertime
      for (let i = 0; i < invokes.length && i < SYNTH_PLAY_VOICE_COUNT; ++i) {
        pacertime = Math.max(
          pacertime,
          synthplaystart(i, starttime, invokes[i]),
        )
      }
    },
    setvoiceconfig(
      index: number,
      config: number | string,
      value: number | string | number[] = '',
    ) {
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
        pushcoldvoiceconfig()
        pushwasmfxsab(engine, fxsab)
      }
    },
    destroy() {
      scheduler.clear()
    },
  }
}
