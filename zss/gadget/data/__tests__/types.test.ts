import {
  CHARS_PER_ROW,
  CHARS_TOTAL_ROWS,
  CHAR_HEIGHT,
  CHAR_WIDTH,
  FILE_BYTES_PER_CHAR,
  FILE_BYTES_PER_COLOR,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
  LAYER_TYPE,
  PALETTE_COLORS,
  VIEWSCALE,
  createcontrol,
  createdither,
  createmedia,
  createsprite,
  createsprites,
  createtiles,
  layersreadcontrol,
  layersreadmedia,
  paneladdress,
} from 'zss/gadget/data/types'
import { COLOR } from 'zss/words/types'

describe('types', () => {
  describe('constants', () => {
    it('should have correct constant values', () => {
      expect(FILE_BYTES_PER_CHAR).toBe(14)
      expect(FILE_BYTES_PER_COLOR).toBe(3)
      expect(CHAR_WIDTH).toBe(8)
      expect(CHAR_HEIGHT).toBe(14)
      expect(CHARS_PER_ROW).toBe(16)
      expect(CHARS_TOTAL_ROWS).toBe(16)
      expect(PALETTE_COLORS).toBe(16)
      expect(INPUT_ALT).toBe(0x0001)
      expect(INPUT_CTRL).toBe(0x0010)
      expect(INPUT_SHIFT).toBe(0x0100)
    })
  })

  describe('createtiles', () => {
    it('should create a tiles layer with correct structure', () => {
      const tiles = createtiles('player1', 0, 10, 20)
      expect(tiles.id).toBe('t:player1:0')
      expect(tiles.type).toBe(LAYER_TYPE.TILES)
      expect(tiles.width).toBe(10)
      expect(tiles.height).toBe(20)
      expect(tiles.char).toHaveLength(200)
      expect(tiles.color).toHaveLength(200)
      expect(tiles.bg).toHaveLength(200)
      expect(tiles.stats).toHaveLength(200)
    })

    it('should initialize arrays with zeros by default', () => {
      const tiles = createtiles('player1', 0, 5, 5)
      expect(tiles.char.every((v) => v === 0)).toBe(true)
      expect(tiles.color.every((v) => v === 0)).toBe(true)
      expect(tiles.stats.every((v) => v === 0)).toBe(true)
    })

    it('should initialize bg array with provided value', () => {
      const tiles = createtiles('player1', 0, 5, 5, 15)
      expect(tiles.bg.every((v) => v === 15)).toBe(true)
    })

    it('should use default bg value of 0', () => {
      const tiles = createtiles('player1', 0, 5, 5)
      expect(tiles.bg.every((v) => v === 0)).toBe(true)
    })
  })

  describe('createsprite', () => {
    it('should create a sprite with correct structure', () => {
      const sprite = createsprite('player1', 0, 'sprite1')
      expect(sprite.id).toBe('s:player1:0:sprite1')
      expect(sprite.x).toBe(0)
      expect(sprite.y).toBe(0)
      expect(sprite.char).toBe(1)
      expect(sprite.color).toBe(15)
      expect(sprite.bg).toBe(COLOR.ONCLEAR)
      expect(sprite.stat).toBe(0)
    })

    it('should use provided char and color values', () => {
      const sprite = createsprite('player1', 0, 'sprite1', 5, 10)
      expect(sprite.char).toBe(5)
      expect(sprite.color).toBe(10)
    })
  })

  describe('createsprites', () => {
    it('should create a sprites layer with correct structure', () => {
      const sprites = createsprites('player1', 0)
      expect(sprites.id).toBe('player1:0')
      expect(sprites.type).toBe(LAYER_TYPE.SPRITES)
      expect(sprites.sprites).toEqual([])
    })
  })

  describe('createdither', () => {
    it('should create a dither layer with correct structure', () => {
      const dither = createdither('player1', 0, 15, 10)
      expect(dither.id).toBe('d:player1:0')
      expect(dither.type).toBe(LAYER_TYPE.DITHER)
      expect(dither.width).toBe(15)
      expect(dither.height).toBe(10)
      expect(dither.alphas).toHaveLength(150)
    })

    it('should initialize alphas array with zeros by default', () => {
      const dither = createdither('player1', 0, 5, 5)
      expect(dither.alphas.every((v) => v === 0)).toBe(true)
    })

    it('should initialize alphas array with provided fill value', () => {
      const dither = createdither('player1', 0, 5, 5, 255)
      expect(dither.alphas.every((v) => v === 255)).toBe(true)
    })
  })

  describe('createmedia', () => {
    it('should create a media layer with string media', () => {
      const media = createmedia('player1', 0, 'image/png', 'base64string')
      expect(media.id).toBe('m:player1:0')
      expect(media.type).toBe(LAYER_TYPE.MEDIA)
      expect(media.mime).toBe('image/png')
      expect(media.media).toBe('base64string')
    })

    it('should create a media layer with array media', () => {
      const mediaArray = [1, 2, 3, 4, 5]
      const media = createmedia('player1', 0, 'image/png', mediaArray)
      expect(media.id).toBe('m:player1:0')
      expect(media.type).toBe(LAYER_TYPE.MEDIA)
      expect(media.mime).toBe('image/png')
      expect(media.media).toEqual(mediaArray)
    })
  })

  describe('createcontrol', () => {
    it('should create a control layer with correct structure', () => {
      const control = createcontrol('player1', 0)
      expect(control.id).toBe('c:player1:0')
      expect(control.type).toBe(LAYER_TYPE.CONTROL)
      expect(control.focusx).toBe(0)
      expect(control.focusy).toBe(0)
      expect(control.focusid).toBe('player1')
      expect(control.viewscale).toBe(VIEWSCALE.MID)
      expect(control.graphics).toBe('flat')
      expect(control.facing).toBe(0)
    })
  })

  describe('layersreadmedia', () => {
    it('should filter media layers from layers array', () => {
      const tiles = createtiles('p1', 0, 5, 5)
      const media1 = createmedia('p1', 0, 'image/png', 'data1')
      const media2 = createmedia('p1', 1, 'image/jpg', 'data2')
      const dither = createdither('p1', 0, 5, 5)

      const layers = [tiles, media1, dither, media2]
      const mediaLayers = layersreadmedia(layers)

      expect(mediaLayers).toHaveLength(2)
      expect(mediaLayers[0]).toBe(media1)
      expect(mediaLayers[1]).toBe(media2)
    })

    it('should return empty array when no media layers present', () => {
      const tiles = createtiles('p1', 0, 5, 5)
      const dither = createdither('p1', 0, 5, 5)
      const layers = [tiles, dither]
      const mediaLayers = layersreadmedia(layers)
      expect(mediaLayers).toEqual([])
    })
  })

  describe('layersreadcontrol', () => {
    it('should extract control values from layers', () => {
      const tiles = createtiles('p1', 0, 20, 15)
      const control = createcontrol('p1', 0)
      control.focusx = 10
      control.focusy = 5
      control.viewscale = VIEWSCALE.NEAR
      control.graphics = 'iso'
      control.facing = 2

      const layers = [tiles, control]
      const result = layersreadcontrol(layers)

      expect(result.width).toBe(20)
      expect(result.height).toBe(15)
      expect(result.focusx).toBe(10)
      expect(result.focusy).toBe(5)
      expect(result.viewscale).toBe(VIEWSCALE.NEAR)
      expect(result.graphics).toBe('iso')
      expect(result.facing).toBe(2)
    })

    it('should use maximum dimensions from tiles and dither layers', () => {
      const tiles = createtiles('p1', 0, 10, 5)
      const dither = createdither('p1', 0, 15, 20)
      const control = createcontrol('p1', 0)

      const layers = [tiles, dither, control]
      const result = layersreadcontrol(layers)

      expect(result.width).toBe(15)
      expect(result.height).toBe(20)
    })

    it('should use default values when no control layer present', () => {
      const tiles = createtiles('p1', 0, 10, 10)
      const layers = [tiles]
      const result = layersreadcontrol(layers)

      expect(result.width).toBe(10)
      expect(result.height).toBe(10)
      expect(result.viewscale).toBe(VIEWSCALE.MID)
      expect(result.graphics).toBe('flat')
      expect(result.facing).toBe(0)
    })

    it('should use last control layer values if multiple control layers present', () => {
      const control1 = createcontrol('p1', 0)
      control1.focusx = 5
      control1.viewscale = VIEWSCALE.FAR

      const control2 = createcontrol('p1', 1)
      control2.focusx = 15
      control2.viewscale = VIEWSCALE.NEAR

      const layers = [control1, control2]
      const result = layersreadcontrol(layers)

      expect(result.focusx).toBe(15)
      expect(result.viewscale).toBe(VIEWSCALE.NEAR)
    })
  })

  describe('paneladdress', () => {
    it('should create panel address from chip and target', () => {
      expect(paneladdress('chip1', 'target1')).toBe('chip1:target1')
      expect(paneladdress('abc', 'xyz')).toBe('abc:xyz')
    })
  })
})
