import { invokeplay, parseplay } from '../../playnotation'
import { SYNTH_PLAY_VOICE_COUNT } from '../../synthdefaults'
import { playpatternendtime } from '../wasm/playstart'

import type { LEVEL_STABILITY_FX } from './levelstabilityscenarios'

export type SCALE_CREW_SECTION = 'intro' | 'climax' | 'full'

export type LEVEL_STABILITY_VOICE_CONFIG = [string, string | number | number[]]

/** Voice + FX from the SCALE CREW board patch. */
export const SCALE_CREW_VOICE_CONFIGS: LEVEL_STABILITY_VOICE_CONFIG[] = [
  ['amsawtooth', ''],
  ['modtype', 'sawtooth'],
  ['harmonicity', 7],
]

export const SCALE_CREW_FX: LEVEL_STABILITY_FX[] = [
  { fx: 'fcrush', config: 50, value: '' },
  { fx: 'fcrush', config: 'rate', value: 12 },
  { fx: 'reverb', config: 'on', value: '' },
  { fx: 'reverb', config: 'decay', value: 0.5 },
]

const SCALE_CREW_INTRO = [
  '0;cxdxexfxgxaxb!x+cx',
  '0;-b!x+cxdxexfxgxaxb!x',
  '0;-axb!x+cxdxexfxgxax',
  '0;-gxaxb!x+cxdxexfxgx',
]

const SCALE_CREW_GROOVE = [
  '0;--qc;cxdxexfxgxaxb!x+cx',
  '0;--qb!;-b!x+cxdxexfxgxaxb!x',
  '0;--qa;-axb!x+cxdxexfxgxax',
  '0;--qg;-gxaxb!x+cxdxexfxgx',
]

const SCALE_CREW_DRUMS_ENTER = [
  'i9000;--qc;cxdxexfxgxaxb!x+cx',
  'i9xpx;--qb!;-b!x+cxdxexfxgxaxb!x',
  'i9xpx;--qa;-axb!x+cxdxexfxgxax',
  'i9xpx;--qg;-gxaxb!x+cxdxexfxgx',
]

const SCALE_CREW_DENSE_A = [
  's460xpx0x;--qc;cxdxexfxgxaxb!x+cx',
  's9x0xpx0x;--qb!;-b!x+cxdxexfxgxaxb!x',
  's4x0xpx0x;--qa;-axb!x+cxdxexfxgxax',
  's9x0xpx0x;--qg;-gxaxb!x+cxdxexfxgx',
]

const SCALE_CREW_DENSE_B = [
  's460xpx0x6x0x;--qcxb!x;',
  's9x0xpx0x2x0x;--qaxgx;',
  's4x0xpx0x4x1x;--qgxfx;',
  's9x0xpx0x8x8x;--qfxex;',
]

const SCALE_CREW_DENSE_C = [
  's460xpx0x6x0x0x0x;--qcxb!x;cxdefxxxcxdefxxx',
  's9x0xpx0x2x0x0x0x;--qaxgx;+cxdefxxxcxdefxxx',
  's4x0xpx0x4x1x0x0x;--qgxfx;cxgab!xb!xb!xcxdefxxx',
  's9x0xpx0x8x8x0x0x;--qfxex;cxga+c-xxcxgab!xxx',
]

const SCALE_CREW_DENSE_D = [
  's460xpx0x6x0x;--qcxb!x;',
  's9x0xpx0x2x0x;--qaxgx;',
  's4x0xpx0x4x1x;--qgxfx;',
  's9x0xpx0x8x8x;--qfxex;',
]

const SCALE_CREW_OUTRO = ['s460xpx0x6x0xxxxxxxxxpxpxpx;--qcxb!xaxhgc;']

function repeatblock(block: string[], count: number): string[] {
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    out.push(...block)
  }
  return out
}

/** Melody-only variant: drop the leading drum invoke before the first semicolon. */
export function scalecrewmelodyonlyplay(play: string): string {
  const parts = play.split(';')
  if (parts.length <= 1) {
    return play
  }
  const head = parts[0] ?? ''
  const hasmelody = /[c-g]/i.test(head)
  if (hasmelody) {
    return play
  }
  return parts.slice(1).join(';')
}

export function scalecrewmelodyonlysequence(plays: string[]): string[] {
  return plays.map((play) => scalecrewmelodyonlyplay(play))
}

export function buildscalecrewsequence(section: SCALE_CREW_SECTION): string[] {
  switch (section) {
    case 'intro':
      return [...SCALE_CREW_INTRO]
    case 'climax':
      return [
        ...repeatblock(SCALE_CREW_DENSE_A, 4),
        ...repeatblock(SCALE_CREW_DENSE_B, 4),
        ...repeatblock(SCALE_CREW_DENSE_C, 2),
        ...repeatblock(SCALE_CREW_DENSE_D, 2),
        ...SCALE_CREW_OUTRO,
      ]
    case 'full':
      return [
        ...SCALE_CREW_INTRO,
        ...repeatblock(SCALE_CREW_GROOVE, 2),
        ...repeatblock(SCALE_CREW_DRUMS_ENTER, 2),
        ...repeatblock(SCALE_CREW_DENSE_A, 4),
        ...repeatblock(SCALE_CREW_DENSE_B, 4),
        ...repeatblock(SCALE_CREW_DENSE_C, 2),
        ...repeatblock(SCALE_CREW_DENSE_D, 2),
        ...SCALE_CREW_OUTRO,
      ]
  }
}

/** Simulate #play pacer advance to estimate offline render length. */
export function estimatesequencedurationsec(plays: string[]): number {
  let pacertime = 0
  for (let p = 0; p < plays.length; p++) {
    const invokes = parseplay(plays[p])
    const starttime = pacertime
    let end = starttime
    for (let i = 0; i < invokes.length && i < SYNTH_PLAY_VOICE_COUNT; i++) {
      const pattern = invokeplay(i, starttime, invokes[i], true)
      end = Math.max(end, playpatternendtime(pattern, starttime))
    }
    pacertime = end
  }
  return pacertime + 1.5
}

export function buildscalecrewsequencewithmelody(section: SCALE_CREW_SECTION): {
  full: string[]
  melody: string[]
} {
  const full = buildscalecrewsequence(section)
  return {
    full,
    melody: scalecrewmelodyonlysequence(full),
  }
}
