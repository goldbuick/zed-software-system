import { WORD_VALUE } from 'zss/chip'
import { UNOBSERVE_FUNC } from 'zss/device/shared'

export const BYTES_PER_COLOR = 3

export const PALETTE_COLOR_RANGE = 63

export const COLOR_TINDEX = 32
export const COLOR_SINDEX = 33

const CHAR_SCALE = 2

export const CHAR_WIDTH = 8
export const CHAR_HEIGHT = 14
export const DRAW_CHAR_WIDTH = CHAR_WIDTH * CHAR_SCALE
export const DRAW_CHAR_HEIGHT = CHAR_HEIGHT * CHAR_SCALE
export const BYTES_PER_CHAR = CHAR_WIDTH * CHAR_HEIGHT
export const CHARS_PER_ROW = 16

export const CHAR_YSCALE = CHAR_WIDTH / CHAR_HEIGHT

export type TILES = {
  char: number[]
  color: number[]
  bg: number[]
}

export type SPRITE = {
  id: string
  x: number
  y: number
  char: number
  color: number
  bg: number
}

export enum LAYER_TYPE {
  BLANK,
  TILES,
  SPRITES,
  DITHER,
  MEDIA,
  CONTROL,
}

export type LAYER_BLANK = {
  id: string
  type: LAYER_TYPE.BLANK
}

export type LAYER_TILES = {
  id: string
  type: LAYER_TYPE.TILES
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
}

export type LAYER_SPRITES = {
  id: string
  type: LAYER_TYPE.SPRITES
  sprites: SPRITE[]
}

export type LAYER_DITHER = {
  id: string
  type: LAYER_TYPE.DITHER
  width: number
  height: number
  alphas: number[]
}

export type LAYER_MEDIA = {
  id: string
  type: LAYER_TYPE.MEDIA
  media: string
}

export type LAYER_CONTROL = {
  id: string
  type: LAYER_TYPE.CONTROL
  focusx: number
  focusy: number
  focusid: string
  viewscale: number
}

export type LAYER =
  | LAYER_BLANK
  | LAYER_TILES
  | LAYER_SPRITES
  | LAYER_DITHER
  | LAYER_MEDIA
  | LAYER_CONTROL

function arrayof(size: number, fill: number): number[] {
  return new Array(size).fill(fill)
}

export function createtiles(
  player: string,
  index: number,
  width: number,
  height: number,
  bg = 0,
): LAYER_TILES {
  const size = width * height
  return {
    id: `tiles:${player}:${index}`,
    type: LAYER_TYPE.TILES,
    width,
    height,
    char: arrayof(size, 0),
    color: arrayof(size, 0),
    bg: arrayof(size, bg),
  }
}

export function createsprite(
  player: string,
  index: number,
  id: string,
  char = 1,
  color = 15,
) {
  return {
    id: `sprites:${player}:${index}:${id}`,
    x: 0,
    y: 0,
    char,
    color,
    bg: COLOR_TINDEX,
  }
}

export function createsprites(player: string, index: number): LAYER_SPRITES {
  return {
    id: `sprites:${player}:${index}`,
    type: LAYER_TYPE.SPRITES,
    sprites: [],
  }
}

export function createdither(
  player: string,
  index: number,
  width: number,
  height: number,
  fill = 0,
): LAYER_DITHER {
  const size = width * height
  return {
    id: `dither:${player}:${index}`,
    type: LAYER_TYPE.DITHER,
    width,
    height,
    alphas: arrayof(size, fill),
  }
}

export function createlayercontrol(
  player: string,
  index: number,
): LAYER_CONTROL {
  return {
    id: `control:${player}:${index}`,
    type: LAYER_TYPE.CONTROL,
    focusx: 0,
    focusy: 0,
    focusid: player,
    viewscale: 2,
  }
}

export function layersreadcontrol(layers: LAYER[]) {
  let width = 0
  let height = 0
  let focusx = 0
  let focusy = 0
  let viewscale = 1

  layers.forEach((layer) => {
    switch (layer.type) {
      case LAYER_TYPE.TILES:
        width = Math.max(width, layer.width)
        height = Math.max(height, layer.height)
        break
      case LAYER_TYPE.DITHER:
        width = Math.max(width, layer.width)
        height = Math.max(height, layer.height)
        break
      case LAYER_TYPE.CONTROL:
        focusx = layer.focusx
        focusy = layer.focusy
        viewscale = layer.viewscale
        break
    }
  })

  return { width, height, focusx, focusy, viewscale }
}

export enum PANEL_TYPE {
  START,
  LEFT,
  RIGHT,
  TOP,
  BOTTOM,
  SCROLL,
}

export const PANEL_TYPE_MAP: Record<string, PANEL_TYPE> = {
  start: PANEL_TYPE.START,
  left: PANEL_TYPE.LEFT,
  right: PANEL_TYPE.RIGHT,
  top: PANEL_TYPE.TOP,
  bottom: PANEL_TYPE.BOTTOM,
  scroll: PANEL_TYPE.SCROLL,
}

export const PANEL_TYPE_SIZES: Record<PANEL_TYPE, number> = {
  [PANEL_TYPE.START]: 1,
  [PANEL_TYPE.LEFT]: 20,
  [PANEL_TYPE.RIGHT]: 20,
  [PANEL_TYPE.TOP]: 1,
  [PANEL_TYPE.BOTTOM]: 1,
  [PANEL_TYPE.SCROLL]: 40,
}

export type PANEL_ITEM = WORD_VALUE | WORD_VALUE[]

export type PANEL = {
  id: string
  name: string
  edge: PANEL_TYPE
  size: number
  text: PANEL_ITEM[]
}

export type PANEL_SHARED = Record<string, UNOBSERVE_FUNC>

export type GADGET_STATE = {
  player: string
  layers: LAYER[]
  layout: PANEL[]
  layoutreset: boolean
  layoutfocus: string
}

export const INPUT_ALT = 0x0001
export const INPUT_CTRL = 0x0010
export const INPUT_SHIFT = 0x0100

export enum INPUT {
  NONE,
  MOVE_UP,
  MOVE_DOWN,
  MOVE_LEFT,
  MOVE_RIGHT,
  OK_BUTTON,
  CANCEL_BUTTON,
  MENU_BUTTON,
}
