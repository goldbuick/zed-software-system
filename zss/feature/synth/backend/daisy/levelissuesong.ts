import type { LEVEL_STABILITY_SCENARIO } from './levelstabilityscenarios'
import { estimatesequencedurationsec } from './scalecrewsong'
import { SYNTH_PLAY_VOICE_COUNT } from '../../synthdefaults'

export const LEVEL_ISSUE_SONG_ID = 'level-issue-song'

export const LEVEL_ISSUE_VOICE_CONFIGS: LEVEL_STABILITY_SCENARIO['voiceconfigs'] = [
  ['amsawtooth', ''],
  ['env', [0.03, 0.2, 0.03, 0.1]],
]

function repeatblock(lines: string[], count: number): string[] {
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    out.push(...lines)
  }
  return out
}

/** `#play` lines in board order (#repeat expanded). Matches user repro board. */
export function buildlevelissueplaysequence(): string[] {
  const intro = repeatblock(
    [
      ...repeatblock(['ic+cbcec-c+c;s0'], 3),
      ...repeatblock(['ic+cbcfc-c+c;s0'], 3),
    ],
    2,
  )

  const denseblock = [
    ...repeatblock(['ic+cb#cec-c+c;-ic+cb#cec-c+c; spxxx pxxx pxxx 9x46'], 3),
    ...repeatblock(['ic+cb#cfc-c+c;-ic+cb#cfc-c+c; spxxx pxxx pxxx 9x1x'], 3),
  ]

  const mid = repeatblock(
    [
      ...repeatblock(denseblock, 2),
      ...repeatblock(
        [
          ...repeatblock(['ic+cb#;-ic+cb#cec-c+c; spxxx 74x4 pxxx 9x46'], 3),
          ...repeatblock(['ic+cb#;-ic+cb#cfc-c+c; spxxx ppx7 1xxx 9x1x'], 3),
        ],
        2,
      ),
      ...repeatblock(
        [
          ...repeatblock(['ic+cbcec-c+c; i+c+cbec; s0x0x0x0x'], 3),
          ...repeatblock(['ic+cbcfc-c+c; i+ct+cccc q-b; s0x0x0x0x'], 3),
        ],
        2,
      ),
    ],
    2,
  )

  const outro = [
    'icbe; i+c-cbec;0',
    'icbe; i+c-cbec+ec;0',
    'icbf; i+ct+cccc q-b;0',
    'icbf; i+ct+cccc q-bcbiehc; s9xxx 0x1',
  ]

  return [...intro, ...mid, ...outro]
}

/** Keep one semicolon voice lane; others become empty so timing is unchanged. */
export function isolateplayvoice(play: string, voiceindex: number): string {
  const parts = play.split(';')
  while (parts.length < SYNTH_PLAY_VOICE_COUNT) {
    parts.push('')
  }
  return parts
    .map((part, idx) => (idx === voiceindex ? part : ''))
    .join(';')
}

export function filterplaysequencevoice(
  playsequence: string[],
  voiceindex: number,
): string[] {
  return playsequence.map((play) => isolateplayvoice(play, voiceindex))
}

export type LEVEL_ISSUE_VOICE_ROLE = 'melody' | 'drums' | 'mixed' | 'empty'

export function classifyplayvoicepart(part: string): LEVEL_ISSUE_VOICE_ROLE {
  const text = part.trim()
  if (text === '') {
    return 'empty'
  }
  const hasmelody = /[c-g]/i.test(text)
  const hasdrum =
    /[0-9px]/i.test(text) && !/[c-g]/i.test(text.replace(/x/g, ''))
  if (hasmelody && hasdrum) {
    return 'mixed'
  }
  if (hasmelody) {
    return 'melody'
  }
  if (hasdrum || /[0-9p]/.test(text)) {
    return 'drums'
  }
  return 'empty'
}

/** Static map of what each voice lane carries across the repro song. */
export function levelissuevoicerolesummary() {
  const playsequence = buildlevelissueplaysequence()
  const roles: Record<number, Record<LEVEL_ISSUE_VOICE_ROLE, number>> = {}
  for (let v = 0; v < SYNTH_PLAY_VOICE_COUNT; v++) {
    roles[v] = { melody: 0, drums: 0, mixed: 0, empty: 0 }
  }
  for (const play of playsequence) {
    const parts = play.split(';')
    for (let v = 0; v < SYNTH_PLAY_VOICE_COUNT; v++) {
      const role = classifyplayvoicepart(parts[v] ?? '')
      roles[v][role]++
    }
  }
  return { playlinecount: playsequence.length, roles }
}

export function levelissuevoicescenario(voiceindex: number): LEVEL_STABILITY_SCENARIO {
  const playsequence = filterplaysequencevoice(buildlevelissueplaysequence(), voiceindex)
  return {
    id: `${LEVEL_ISSUE_SONG_ID}-voice-${voiceindex}`,
    description: `Level-issue repro — voice ${voiceindex} only`,
    playsequence,
    durationsec: estimatesequencedurationsec(playsequence),
    voiceconfigs: LEVEL_ISSUE_VOICE_CONFIGS,
  }
}

export function levelissuescenario(): LEVEL_STABILITY_SCENARIO {
  const playsequence = buildlevelissueplaysequence()
  return {
    id: LEVEL_ISSUE_SONG_ID,
    description: 'User level-issue repro (amsaw, env 0.03/0.2/0.03/0.1, no FX)',
    playsequence,
    durationsec: estimatesequencedurationsec(playsequence),
    voiceconfigs: LEVEL_ISSUE_VOICE_CONFIGS,
  }
}

export function levelissuesongmeta() {
  const playsequence = buildlevelissueplaysequence()
  return {
    id: LEVEL_ISSUE_SONG_ID,
    playlinecount: playsequence.length,
    estimateddurationsec: estimatesequencedurationsec(playsequence),
    voiceconfigs: LEVEL_ISSUE_VOICE_CONFIGS,
    firstplays: playsequence.slice(0, 4),
    lastplays: playsequence.slice(-4),
  }
}
