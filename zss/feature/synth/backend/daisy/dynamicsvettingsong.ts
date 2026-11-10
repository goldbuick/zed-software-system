import { estimatesequencedurationsec } from './scalecrewsong'
import type {
  LEVEL_STABILITY_FX,
  LEVEL_STABILITY_SCENARIO,
  LEVEL_STABILITY_VOICE_CONFIG,
} from './levelstabilitytypes'

/** Sawtooth + port + echo song used to vet maincomp / sidechain feel. */
export const DYNAMICS_VET_SONG_ID = 'dynamics-vet-song'

export const DYNAMICS_VET_VOICE_CONFIGS: LEVEL_STABILITY_VOICE_CONFIG[] = [
  ['sawtooth', ''],
  ['port', 0.03],
]

export const DYNAMICS_VET_FX: LEVEL_STABILITY_FX[] = [
  { fx: 'echo', config: 'on', value: '' },
  { fx: 'echo', config: 'feedback', value: 0.7 },
]

function repeatblock(lines: string[], count: number): string[] {
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    out.push(...lines)
  }
  return out
}

/**
 * `#play` lines from the board repro (#repeat expanded).
 * Melody-only → dual harmony → drums enter → denser drums → drums-only wind-down.
 */
export function builddynamicsvetplaysequence(): string[] {
  const melodya = [
    '--sdxb#xaxfx',
    '--sdxbxgxex',
    '--sdx+cxdxex',
    '--sdxgxaxbx',
  ]
  const melodyb = [
    '--scxbxgxex',
    '--scxaxfxdx',
    '--scxax+cxdx',
    '--scxfxgxax',
  ]

  const intro = repeatblock(
    [...repeatblock(melodya, 2), ...repeatblock(melodyb, 2)],
    2,
  )

  const duala = [
    '--sdxb#xaxfx;sdxb#xaxfx',
    '--sdxbxgxex;sdxbxgxex',
    '--sdx+cxdxex;t.dx+cxdxex',
    '--sdxgxaxbx;t.dxgxaxbx',
  ]
  const dualb = [
    '--scxbxgxex;scxbxgxex',
    '--scxaxfxdx;scxaxfxdx',
    '--scxax+cxdx;t.cxax+cxdx',
    '--scxfxgxax;t.cxfxgxax',
  ]
  const dual = repeatblock(
    [...repeatblock(duala, 2), ...repeatblock(dualb, 2)],
    2,
  )

  const drumsa = [
    'spxxx0xxx;--sdxb#xaxfx;sdxb#xaxfx',
    's0xxxpxxx;--sdxbxgxex;sdxbxgxex',
    'spxxx0xxx;--sdx+cxdxex;t.dx+cxdxexfx',
    's0xxxpxxx;--sdxgxaxbx;t.dxgxaxbxc-g',
  ]
  const drumsb = [
    's0xxx1x1x;--scxbxgxex;scxbxgcex',
    's0xxx1x9x;--scxaxfxdx;scxaxfxdx',
    's01xx5x5x;--scxax+cxdx;t.cxax+cxdx',
    's01xxpxpx;--scxfxgxax;t.cxfxgxax',
  ]
  const drumsenter = repeatblock(
    [...repeatblock(drumsa, 2), ...repeatblock(drumsb, 2)],
    2,
  )

  const densea = [
    'spxrx0xrx;-sdxb#dadfd;sdxb#xaxfx',
    's0xrxpxrx;-sdxbxgxex;sdxbxgxex',
    'spxrx0xrx;-sdx+cxdxex;t.dx+cxdxexfx',
    's0xrxpxrx;-sdxgxaxbx;t.dxgxaxbxc-g',
  ]
  const denseb = [
    's0xrx1x1x;-scxbxgxed;scxbxgcex',
    's0xrx1x9x;-scdaxfxdx;scxaxfxdx',
    's01rx5x5x;-scxax+cxdf;t.cxax+cxdx',
    's01rxpxpx;-scxfxgxaf;t.cxfxgxax',
  ]
  const dense = repeatblock(
    [...repeatblock(densea, 2), ...repeatblock(denseb, 2)],
    2,
  )

  const windmelodaya = [
    'spxrx0xrx;-sdxb#dadfd',
    's0xrxpxrx;-sdxbxgxex',
    'spxrx0xrx;-sdx+cxdxex',
    's0xrxpxrx;-sdxgxaxbx',
  ]
  const windmelodyb = [
    's0xrx1x1x;-scxbxgxed',
    's0xrx1x9x;-scdaxfxdx',
    's01rx5x5x;-scxax+cxdf',
    's01rxpxpx;-scxfxgxaf',
  ]
  const windmelody = repeatblock(
    [...repeatblock(windmelodaya, 2), ...repeatblock(windmelodyb, 2)],
    2,
  )

  const winddown = [
    ...repeatblock(
      [
        'spxrx0xrx;-scx',
        's0xrxpxrx;-scx',
        'spxrx0xrx;-scx',
        's0xrxpxrx;-scfga',
      ],
      2,
    ),
    ...repeatblock(
      [
        's0xrx1x1x;-sdx',
        's0xrx1x9x;-sdx',
        's01rx5x5x;-sdx',
        's01rxpxpx;-sdfga',
      ],
      2,
    ),
  ]

  const coda = [
    '--sdxb#xaxfx',
    '--sdxbxgxex',
    '--sdx+cxdxex',
    '--sdxgxqabghb#',
  ]

  return [
    ...intro,
    ...dual,
    ...drumsenter,
    ...dense,
    ...windmelody,
    ...winddown,
    ...coda,
  ]
}

function dynamicsvetscenario(
  id: string,
  description: string,
  overrides: Partial<LEVEL_STABILITY_SCENARIO> = {},
): LEVEL_STABILITY_SCENARIO {
  const playsequence = builddynamicsvetplaysequence()
  return {
    id,
    description,
    playsequence,
    durationsec: estimatesequencedurationsec(playsequence),
    voiceconfigs: DYNAMICS_VET_VOICE_CONFIGS,
    fx: DYNAMICS_VET_FX,
    ...overrides,
  }
}

export function dynamicsvetfullscenario(): LEVEL_STABILITY_SCENARIO {
  return dynamicsvetscenario(
    DYNAMICS_VET_SONG_ID,
    'Sawtooth/port/echo song — maincomp + sidechain ON (dynamics vet)',
  )
}

export function dynamicsvetnocompscenario(): LEVEL_STABILITY_SCENARIO {
  return dynamicsvetscenario(
    `${DYNAMICS_VET_SONG_ID}-comp-off`,
    'Sawtooth/port/echo song — maincomp OFF',
    { maincompbypass: true },
  )
}

export function dynamicsvetnoscenario(): LEVEL_STABILITY_SCENARIO {
  return dynamicsvetscenario(
    `${DYNAMICS_VET_SONG_ID}-sc-off`,
    'Sawtooth/port/echo song — sidechain OFF',
    { sidechainbypass: true },
  )
}

export function dynamicsvetmeta() {
  const playsequence = builddynamicsvetplaysequence()
  return {
    id: DYNAMICS_VET_SONG_ID,
    playlinecount: playsequence.length,
    estimateddurationsec: estimatesequencedurationsec(playsequence),
    voiceconfigs: DYNAMICS_VET_VOICE_CONFIGS,
    fx: DYNAMICS_VET_FX,
    firstplays: playsequence.slice(0, 4),
    lastplays: playsequence.slice(-4),
  }
}
