import {
  LAYER_TYPE,
  createcontrol,
  createdither,
  createmedia,
  createsprite,
  createsprites,
  createtiles,
} from 'zss/gadget/data/types'
import type { GADGET_STATE } from 'zss/gadget/data/types'

import {
  gadgetdocumentjson,
  parsegadgetdocumentjson,
} from '../gadgetsyncdb'

function roundtrip(state: GADGET_STATE) {
  const json = gadgetdocumentjson(state)
  expect(json).toBeDefined()
  return parsegadgetdocumentjson(json!)
}

describe('gadgetdocumentjson / parsegadgetdocumentjson', () => {
  it('round-trips empty gadget state', () => {
    const state: GADGET_STATE = {
      id: 'test-id',
      board: 'test-board',
      boardname: '',
      exiteast: '',
      exitwest: '',
      exitnorth: '',
      exitsouth: '',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
      layers: [],
      scroll: [],
      sidebar: [],
    }

    const imported = roundtrip(state)

    expect(imported).toBeDefined()
    expect(imported?.id).toBe(state.id)
    expect(imported?.board).toBe(state.board)
    expect(imported?.boardname).toBe('')
    expect(imported?.layers).toEqual([])
  })

  it('round-trips gadget state with tiles layer', () => {
    const tiles = createtiles('player1', 0, 5, 5)
    const state: GADGET_STATE = {
      id: 'test-id',
      board: 'test-board',
      boardname: '',
      exiteast: '',
      exitwest: '',
      exitnorth: '',
      exitsouth: '',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
      layers: [tiles],
      scroll: [],
      sidebar: [],
    }

    const imported = roundtrip(state)

    expect(imported?.layers).toHaveLength(1)
    expect(imported?.layers?.[0].type).toBe(LAYER_TYPE.TILES)
    expect(imported?.layers?.[0].id).toBe(tiles.id)
    if (imported?.layers?.[0].type === LAYER_TYPE.TILES) {
      expect(imported.layers[0].width).toBe(5)
      expect(imported.layers[0].height).toBe(5)
    }
  })

  it('round-trips gadget state with sprites layer', () => {
    const sprites = createsprites('player1', 0)
    const sprite1 = createsprite('player1', 0, 's1', 1, 15)
    sprite1.x = 10
    sprite1.y = 20
    sprites.sprites.push(sprite1)

    const state: GADGET_STATE = {
      id: 'test-id',
      board: 'test-board',
      boardname: '',
      exiteast: '',
      exitwest: '',
      exitnorth: '',
      exitsouth: '',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
      layers: [sprites],
      scroll: [],
      sidebar: [],
    }

    const imported = roundtrip(state)

    expect(imported?.layers).toHaveLength(1)
    expect(imported?.layers?.[0].type).toBe(LAYER_TYPE.SPRITES)
    expect(imported?.layers?.[0].id).toBe(sprites.id)
    if (imported?.layers?.[0].type === LAYER_TYPE.SPRITES) {
      expect(imported.layers[0].sprites).toHaveLength(1)
      expect(imported.layers[0].sprites[0].id).toBe(sprite1.id)
      expect(imported.layers[0].sprites[0].x).toBe(10)
      expect(imported.layers[0].sprites[0].y).toBe(20)
    }
  })

  it('round-trips gadget state with dither layer', () => {
    const dither = createdither('player1', 0, 10, 10)
    const state: GADGET_STATE = {
      id: 'test-id',
      board: 'test-board',
      boardname: '',
      exiteast: '',
      exitwest: '',
      exitnorth: '',
      exitsouth: '',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
      layers: [dither],
      scroll: [],
      sidebar: [],
    }

    const imported = roundtrip(state)

    expect(imported?.layers).toHaveLength(1)
    expect(imported?.layers?.[0].type).toBe(LAYER_TYPE.DITHER)
    expect(imported?.layers?.[0].id).toBe(dither.id)
    if (imported?.layers?.[0].type === LAYER_TYPE.DITHER) {
      expect(imported.layers[0].width).toBe(10)
      expect(imported.layers[0].height).toBe(10)
    }
  })

  it('round-trips gadget state with media layer', () => {
    const media = createmedia('player1', 0, 'image/png', 'base64data')
    const state: GADGET_STATE = {
      id: 'test-id',
      board: 'test-board',
      boardname: '',
      exiteast: '',
      exitwest: '',
      exitnorth: '',
      exitsouth: '',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
      layers: [media],
      scroll: [],
      sidebar: [],
    }

    const imported = roundtrip(state)

    expect(imported?.layers).toHaveLength(1)
    expect(imported?.layers?.[0].type).toBe(LAYER_TYPE.MEDIA)
    expect(imported?.layers?.[0].id).toBe(media.id)
    if (imported?.layers?.[0].type === LAYER_TYPE.MEDIA) {
      expect(imported.layers[0].mime).toBe('image/png')
      expect(imported.layers[0].media).toBe('base64data')
    }
  })

  it('round-trips gadget state with control layer', () => {
    const control = createcontrol('player1', 0)
    control.focusx = 15
    control.focusy = 20
    control.viewscale = 3
    control.graphics = 'iso'
    control.facing = 2

    const state: GADGET_STATE = {
      id: 'test-id',
      board: 'test-board',
      boardname: '',
      exiteast: '',
      exitwest: '',
      exitnorth: '',
      exitsouth: '',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
      layers: [control],
      scroll: [],
      sidebar: [],
    }

    const imported = roundtrip(state)

    expect(imported?.layers).toHaveLength(1)
    expect(imported?.layers?.[0].type).toBe(LAYER_TYPE.CONTROL)
    expect(imported?.layers?.[0].id).toBe(control.id)
    if (imported?.layers?.[0].type === LAYER_TYPE.CONTROL) {
      expect(imported.layers[0].focusx).toBe(15)
      expect(imported.layers[0].focusy).toBe(20)
      expect(imported.layers[0].viewscale).toBe(3)
      expect(imported.layers[0].graphics).toBe('iso')
      expect(imported.layers[0].facing).toBe(2)
    }
  })

  it('round-trips gadget state with multiple layers', () => {
    const tiles = createtiles('player1', 0, 5, 5)
    const sprites = createsprites('player1', 0)
    const control = createcontrol('player1', 0)

    const state: GADGET_STATE = {
      id: 'test-id',
      board: 'test-board',
      boardname: '',
      exiteast: '',
      exitwest: '',
      exitnorth: '',
      exitsouth: '',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
      layers: [tiles, sprites, control],
      scroll: [],
      sidebar: [],
    }

    const imported = roundtrip(state)

    expect(imported?.layers).toHaveLength(3)
    expect(imported?.layers?.[0].type).toBe(LAYER_TYPE.TILES)
    expect(imported?.layers?.[1].type).toBe(LAYER_TYPE.SPRITES)
    expect(imported?.layers?.[2].type).toBe(LAYER_TYPE.CONTROL)
  })

  it('returns undefined for invalid JSON on parse', () => {
    expect(parsegadgetdocumentjson('not json')).toBeUndefined()
  })

  it('round-trips state with optional fields', () => {
    const tiles = createtiles('player1', 0, 5, 5)
    const state: GADGET_STATE = {
      id: 'test-id',
      board: 'test-board',
      boardname: 'Board B',
      exiteast: 'east',
      exitwest: 'west',
      exitnorth: 'north',
      exitsouth: 'south',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
      over: [tiles],
      under: [tiles],
      layers: [tiles],
      tickers: ['ticker1', 'ticker2'],
      scrollname: 'scroll1',
      scroll: ['item1', 'item2'],
      sidebar: ['sidebar1'],
    }

    const imported = roundtrip(state)

    expect(imported?.boardname).toBe('Board B')
    expect(imported?.exiteast).toBe('east')
    expect(imported?.exitwest).toBe('west')
    expect(imported?.exitnorth).toBe('north')
    expect(imported?.exitsouth).toBe('south')
    expect(imported?.tickers).toEqual(['ticker1', 'ticker2'])
    expect(imported?.scrollname).toBe('scroll1')
    expect(imported?.scroll).toEqual(['item1', 'item2'])
    expect(imported?.sidebar).toEqual(['sidebar1'])
  })
})
