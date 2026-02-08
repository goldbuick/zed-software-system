import { Note } from 'tonal'
import { Part } from 'tone'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { randominteger } from 'zss/mapping/number'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'

import type { AUDIO_CHAIN } from './audiochain'
import { SYNTH_NOTE_ENTRY, SYNTH_NOTE_ON } from './playnotation'
import { SOURCE_TYPE } from './source'
import type { SOURCE_FX_SETUP } from './sourcefxsetup'

export type RECORDING_STATE = {
  recordedticks: SYNTH_NOTE_ENTRY[]
  recordlastpercent: number
  recordisrendering: number
}

export type PLAYBACK_STATE = {
  pacertime: number
  pacercount: number
  pacer: Part
}

export function createtickhandler(
  sourceFx: SOURCE_FX_SETUP,
  chain: AUDIO_CHAIN,
  recording: RECORDING_STATE,
  playback: PLAYBACK_STATE,
) {
  const { SOURCE, FX, FXCHAIN, mapindextofx } = sourceFx
  const { drum } = chain

  return function synthtick(time: number, value: SYNTH_NOTE_ON | null) {
    if (value === null) {
      return
    }
    if (recording.recordisrendering > 0) {
      const currentpercent = Math.round(
        (time / recording.recordisrendering) * 100,
      )
      if (currentpercent !== recording.recordlastpercent) {
        recording.recordlastpercent = currentpercent
        write(SOFTWARE, registerreadplayer(), `${currentpercent}%`)
      }
    } else {
      recording.recordedticks.push([time, value])
    }
    const [chan, duration, note] = value
    const f = mapindextofx(chan)
    if (isstring(note) && ispresent(SOURCE[chan]) && ispresent(FX[f])) {
      switch (SOURCE[chan].source.type) {
        case SOURCE_TYPE.BELLS:
          SOURCE[chan].source.synth.detune.value = randominteger(-3, 3)
          SOURCE[chan].source.sparkle.triggerAttackRelease(
            Note.transposeOctaves(note, 2),
            duration,
            time,
          )
          break
        default:
          break
      }
      SOURCE[chan].source.synth.triggerAttackRelease(note, duration, time)
      const sduration = SOURCE[chan].source.synth.toSeconds(duration)
      const reset = '128n'
      const rampreset = SOURCE[chan].source.synth.toSeconds(reset)
      FXCHAIN.vibrato.depth.rampTo(1, '2n', time)
      FXCHAIN.vibrato.depth.rampTo(0, reset, time + sduration - rampreset)
      FXCHAIN.vibrato.frequency.rampTo(5, '4n', time)
      FXCHAIN.vibrato.frequency.rampTo(1, reset, time + sduration - rampreset)
    }
    if (isnumber(note)) {
      switch (note) {
        case 0:
          drum.ticktrigger(time)
          break
        case 1:
          drum.tweettrigger(time)
          break
        case 2:
          drum.cowbelltrigger(duration, time)
          break
        case 3:
          drum.claptrigger(duration, time)
          break
        case 4:
          drum.hisnaretrigger(duration, time)
          break
        case 5:
          drum.hiwoodblocktrigger(duration, time)
          break
        case 6:
          drum.lowsnaretrigger(duration, time)
          break
        case 7:
          drum.lowtomtrigger(duration, time)
          break
        case 8:
          drum.lowwoodblocktrigger(duration, time)
          break
        case 9:
          drum.basstrigger(time)
          break
        case -1:
          playback.pacercount--
          if (playback.pacercount === 0) {
            playback.pacer.clear()
            playback.pacertime = -1
          }
          break
      }
    }
  }
}
