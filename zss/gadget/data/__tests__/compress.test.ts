import { exportgadgetstate, importgadgetstate } from 'zss/gadget/data/compress'
import {
  LAYER_TYPE,
  createcontrol,
  createdither,
  createmedia,
  createsprite,
  createsprites,
  createtiles,
} from 'zss/gadget/data/types'

describe('compress', () => {
  describe('exportgadgetstate and importgadgetstate', () => {
    it('should export and import empty gadget state', () => {
      const state = {
        id: 'test-id',
        board: 'test-board',
        exiteast: '',
        exitwest: '',
        exitnorth: '',
        exitsouth: '',
        layers: [],
        scroll: [],
        sidebar: [],
      }

      const exported = exportgadgetstate(state)
      const imported = importgadgetstate(exported)

      expect(imported).toBeDefined()
      expect(imported?.id).toBe(state.id)
      expect(imported?.board).toBe(state.board)
      expect(imported?.layers).toEqual([])
    })

    it('should export and import gadget state with tiles layer', () => {
      const tiles = createtiles('player1', 0, 5, 5)
      const state = {
        id: 'test-id',
        board: 'test-board',
        exiteast: '',
        exitwest: '',
        exitnorth: '',
        exitsouth: '',
        layers: [tiles],
        scroll: [],
        sidebar: [],
      }

      const exported = exportgadgetstate(state)
      const imported = importgadgetstate(exported)

      expect(imported?.layers).toHaveLength(1)
      expect(imported?.layers?.[0].type).toBe(LAYER_TYPE.TILES)
      expect(imported?.layers?.[0].id).toBe(tiles.id)
      if (imported?.layers?.[0].type === LAYER_TYPE.TILES) {
        expect(imported.layers[0].width).toBe(5)
        expect(imported.layers[0].height).toBe(5)
      }
    })

    it('should export and import gadget state with sprites layer', () => {
      const sprites = createsprites('player1', 0)
      const sprite1 = createsprite('player1', 0, 's1', 1, 15)
      sprite1.x = 10
      sprite1.y = 20
      sprites.sprites.push(sprite1)

      const state = {
        id: 'test-id',
        board: 'test-board',
        exiteast: '',
        exitwest: '',
        exitnorth: '',
        exitsouth: '',
        layers: [sprites],
        scroll: [],
        sidebar: [],
      }

      const exported = exportgadgetstate(state)
      const imported = importgadgetstate(exported)

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

    it('should export and import gadget state with dither layer', () => {
      const dither = createdither('player1', 0, 10, 10)
      const state = {
        id: 'test-id',
        board: 'test-board',
        exiteast: '',
        exitwest: '',
        exitnorth: '',
        exitsouth: '',
        layers: [dither],
        scroll: [],
        sidebar: [],
      }

      const exported = exportgadgetstate(state)
      const imported = importgadgetstate(exported)

      expect(imported?.layers).toHaveLength(1)
      expect(imported?.layers?.[0].type).toBe(LAYER_TYPE.DITHER)
      expect(imported?.layers?.[0].id).toBe(dither.id)
      if (imported?.layers?.[0].type === LAYER_TYPE.DITHER) {
        expect(imported.layers[0].width).toBe(10)
        expect(imported.layers[0].height).toBe(10)
      }
    })

    it('should export and import gadget state with media layer', () => {
      const media = createmedia('player1', 0, 'image/png', 'base64data')
      const state = {
        id: 'test-id',
        board: 'test-board',
        exiteast: '',
        exitwest: '',
        exitnorth: '',
        exitsouth: '',
        layers: [media],
        scroll: [],
        sidebar: [],
      }

      const exported = exportgadgetstate(state)
      const imported = importgadgetstate(exported)

      expect(imported?.layers).toHaveLength(1)
      expect(imported?.layers?.[0].type).toBe(LAYER_TYPE.MEDIA)
      expect(imported?.layers?.[0].id).toBe(media.id)
      if (imported?.layers?.[0].type === LAYER_TYPE.MEDIA) {
        expect(imported.layers[0].mime).toBe('image/png')
        expect(imported.layers[0].media).toBe('base64data')
      }
    })

    it('should export and import gadget state with control layer', () => {
      const control = createcontrol('player1', 0)
      control.focusx = 15
      control.focusy = 20
      control.viewscale = 3
      control.graphics = 'iso'
      control.facing = 2

      const state = {
        id: 'test-id',
        board: 'test-board',
        exiteast: '',
        exitwest: '',
        exitnorth: '',
        exitsouth: '',
        layers: [control],
        scroll: [],
        sidebar: [],
      }

      const exported = exportgadgetstate(state)
      const imported = importgadgetstate(exported)

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

    it('should export and import gadget state with multiple layers', () => {
      const tiles = createtiles('player1', 0, 5, 5)
      const sprites = createsprites('player1', 0)
      const control = createcontrol('player1', 0)

      const state = {
        id: 'test-id',
        board: 'test-board',
        exiteast: '',
        exitwest: '',
        exitnorth: '',
        exitsouth: '',
        layers: [tiles, sprites, control],
        scroll: [],
        sidebar: [],
      }

      const exported = exportgadgetstate(state)
      const imported = importgadgetstate(exported)

      expect(imported?.layers).toHaveLength(3)
      expect(imported?.layers?.[0].type).toBe(LAYER_TYPE.TILES)
      expect(imported?.layers?.[1].type).toBe(LAYER_TYPE.SPRITES)
      expect(imported?.layers?.[2].type).toBe(LAYER_TYPE.CONTROL)
    })

    it('should handle undefined state', () => {
      const exported = exportgadgetstate(undefined)
      expect(exported).toBeUndefined()

      const imported = importgadgetstate(undefined)
      expect(imported).toBeUndefined()
    })

    it('should export and import state with optional fields', () => {
      const tiles = createtiles('player1', 0, 5, 5)
      const state = {
        id: 'test-id',
        board: 'test-board',
        exiteast: 'east',
        exitwest: 'west',
        exitnorth: 'north',
        exitsouth: 'south',
        over: [tiles],
        under: [tiles],
        layers: [tiles],
        tickers: ['ticker1', 'ticker2'],
        scrollname: 'scroll1',
        scroll: ['item1', 'item2'],
        sidebar: ['sidebar1'],
      }

      const exported = exportgadgetstate(state)
      const imported = importgadgetstate(exported)

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
})
