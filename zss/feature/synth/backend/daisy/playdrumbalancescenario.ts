import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import { tonenotationseconds } from '../../playnotation'

import type { LEVEL_STABILITY_SCENARIO } from './levelstabilitytypes'

export const PLAY_DRUM_BALANCE_SCENARIO_ID = 'play-drum-balance'

export const PLAY_DRUM_BALANCE_NOTE_COUNT = 8

export const PLAY_DRUM_BALANCE_PLAY_PITCH = 'C4'

/** Bass drum id (channel 9 in play notation). */
export const PLAY_DRUM_BALANCE_DRUM_ID = 9

function build8nticks(
  notecount: number,
  note: string | number,
  channel = 0,
): SYNTH_NOTE_ENTRY[] {
  const step = tonenotationseconds('8n')
  const ticks: SYNTH_NOTE_ENTRY[] = []
  for (let i = 0; i < notecount; i++) {
    ticks.push([i * step, [channel, '8n', note]])
  }
  return ticks
}

export function playdrumbalancestemdurationsec(
  notecount = PLAY_DRUM_BALANCE_NOTE_COUNT,
): number {
  const step = tonenotationseconds('8n')
  return notecount * step + 0.5
}

export function playdrumbalanceplayscenario(): LEVEL_STABILITY_SCENARIO {
  const notecount = PLAY_DRUM_BALANCE_NOTE_COUNT
  return {
    id: `${PLAY_DRUM_BALANCE_SCENARIO_ID}-play`,
    description: `${notecount}× 8n ${PLAY_DRUM_BALANCE_PLAY_PITCH} square — play stem`,
    durationsec: playdrumbalancestemdurationsec(notecount),
    voiceconfig: 'square',
    ticks: build8nticks(notecount, PLAY_DRUM_BALANCE_PLAY_PITCH),
    maincompbypass: true,
    sidechainbypass: true,
  }
}

export function playdrumbalancedrumscenario(): LEVEL_STABILITY_SCENARIO {
  const notecount = PLAY_DRUM_BALANCE_NOTE_COUNT
  return {
    id: `${PLAY_DRUM_BALANCE_SCENARIO_ID}-drum`,
    description: `${notecount}× 8n drum ${PLAY_DRUM_BALANCE_DRUM_ID} bass — drum stem`,
    durationsec: playdrumbalancestemdurationsec(notecount),
    voiceconfig: 'square',
    ticks: build8nticks(notecount, PLAY_DRUM_BALANCE_DRUM_ID),
    maincompbypass: true,
    sidechainbypass: true,
  }
}
