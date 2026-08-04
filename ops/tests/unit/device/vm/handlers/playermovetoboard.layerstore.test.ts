/**
 * Evidence + fix: after boardrunner reassignment, stale dest layerstore sprites
 * (leave cell) must not be served; host rebuilds layers from dest memory.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DEVICE } from 'zss/device'
import { handleplayermovetoboard } from 'zss/device/vm/handlers/playermovetoboard'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import type { MEMORY_GADGET_LAYERS } from 'zss/memory/rendering'

jest.mock('zss/device/api', () => ({
  boardrunneridle: jest.fn(),
  boardrunnerthud: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnermanagement', () => ({
  boardrunnerassign: jest.fn(),
  boardrunnerassignmentvalid: jest.fn(() => false),
  boardrunnerelect: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnerpushupdates', () => ({
  boardrunnerpushupdates: jest.fn(),
}))

jest.mock('zss/gadget/graphics/layerz', () => ({
  normalizelayerzvariant: jest.fn((v: string) => v || 'flat'),
}))

const destboard = {
  id: 'board-dest',
  objects: {
    pid_test: { id: 'pid_test', x: 0, y: 12 },
  },
}

const layerstore: Record<string, MEMORY_GADGET_LAYERS> = {
  flat: {
    id: 'layers-dest',
    board: 'board-dest',
    exiteast: '',
    exitwest: '',
    exitnorth: '',
    exitsouth: '',
    exitne: '',
    exitnw: '',
    exitse: '',
    exitsw: '',
    over: [],
    under: [],
    layers: [
      {
        id: 'sprites',
        type: LAYER_TYPE.SPRITES,
        sprites: [
          {
            id: 'pid_test',
            pid: 'pid_test',
            x: 59,
            y: 12,
            char: 2,
            color: 15,
            bg: 0,
            stat: 0,
          },
        ],
      },
    ],
    tickers: [],
  },
}

const rebuiltlayers: MEMORY_GADGET_LAYERS = {
  ...layerstore.flat,
  layers: [
    {
      id: 'sprites',
      type: LAYER_TYPE.SPRITES,
      sprites: [
        {
          id: 'pid_test',
          pid: 'pid_test',
          x: 0,
          y: 12,
          char: 2,
          color: 15,
          bg: 0,
          stat: 0,
        },
      ],
    },
  ],
}

jest.mock('zss/memory/gadgetlayersflags', () => ({
  memoryreadbookgadgetlayersforboard: jest.fn(() => layerstore),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memorymoveplayertoboard: jest.fn(() => true),
  memoryreadplayerboard: jest.fn(() => destboard),
}))

jest.mock('zss/memory/rendering', () => ({
  memoryreadgraphics: jest.fn(() => ({ graphics: 'flat' })),
  memoryreadgadgetlayers: jest.fn(() => rebuiltlayers),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbookbysoftware: jest.fn(() => ({ id: 'main' })),
}))

import { memoryreadbookgadgetlayersforboard } from 'zss/memory/gadgetlayersflags'
import { memoryreadgadgetlayers } from 'zss/memory/rendering'

const LOG = join(process.cwd(), '.cursor', 'debug-boundary-coord.log')

function evidencelog(payload: Record<string, unknown>) {
  mkdirSync(dirname(LOG), { recursive: true })
  appendFileSync(
    LOG,
    `${JSON.stringify({ ...payload, timestamp: Date.now() })}\n`,
  )
}

describe('playermovetoboard host layerstore rebuild', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    jest.clearAllMocks()
    // reset stale leave-cell sprite
    const sprites = layerstore.flat.layers[0]
    if (sprites.type === LAYER_TYPE.SPRITES) {
      sprites.sprites[0].x = 59
      sprites.sprites[0].y = 12
    }
    mkdirSync(dirname(LOG), { recursive: true })
    try {
      writeFileSync(LOG, '')
    } catch {
      // ignore
    }
  })

  it('pins stale leave-cell sprite then rebuilds to host entry cell', () => {
    const before = memoryreadbookgadgetlayersforboard(
      { id: 'main' } as never,
      'board-dest',
    ).flat
    const beforesprite =
      before.layers[0].type === LAYER_TYPE.SPRITES
        ? before.layers[0].sprites[0]
        : undefined
    evidencelog({
      scenario: 'runner_gap_stale_before',
      hypothesis: 'BC_LAYERSTORE',
      spritex: beforesprite?.x,
      spritey: beforesprite?.y,
      hostx: 0,
      hosty: 12,
      stale: beforesprite?.x === 59,
      verdict: beforesprite?.x === 59 ? 'CONFIRMED_stale_leave_cell' : 'UNEXPECTED',
    })
    expect(beforesprite?.x).toBe(59)

    handleplayermovetoboard(vm, {
      session: '',
      player: 'pid_test',
      id: 'm1',
      target: 'vm:playermovetoboard',
      data: ['pid_test', 'board-dest', { x: 0, y: 12 }],
    })

    expect(memoryreadgadgetlayers).toHaveBeenCalledWith('flat', destboard)
    expect(layerstore.flat).toBe(rebuiltlayers)
    const aftersprite =
      layerstore.flat.layers[0].type === LAYER_TYPE.SPRITES
        ? layerstore.flat.layers[0].sprites[0]
        : undefined
    evidencelog({
      scenario: 'runner_gap_after_host_rebuild',
      hypothesis: 'BC_LAYERSTORE',
      spritex: aftersprite?.x,
      spritey: aftersprite?.y,
      hostx: 0,
      hosty: 12,
      stale: aftersprite?.x !== 0,
      verdict:
        aftersprite?.x === 0 && aftersprite?.y === 12
          ? 'FIXED_host_rebuild_matches_entry'
          : 'REGRESSION',
    })
    expect(aftersprite?.x).toBe(0)
    expect(aftersprite?.y).toBe(12)
  })
})
