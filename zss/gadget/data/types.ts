import { BITMAP } from './bitmap'

export const BYTES_PER_COLOR = 3

export const PALETTE_COLOR_RANGE = 63

export type PALETTE_BITMAP = {
  id: string
  count: number
  bitmap: BITMAP
}

const CHAR_SCALE = 2

export const CHAR_WIDTH = 8
export const CHAR_HEIGHT = 14
export const DRAW_CHAR_WIDTH = CHAR_WIDTH * CHAR_SCALE
export const DRAW_CHAR_HEIGHT = CHAR_HEIGHT * CHAR_SCALE
export const BYTES_PER_CHAR = CHAR_WIDTH * CHAR_HEIGHT
export const CHARS_PER_ROW = 16

export type CHARSET_BITMAP = {
  id: string
  count: number
  bitmap: BITMAP
}

export enum LAYER {
  BLANK,
  TILES,
  SPRITES,
  DITHER,
  GUI,
  MEDIA,
}

type LAYER_COMMON = {
  id: string
}

export type TILES = {
  char: number[]
  color: number[]
  bg: number[]
}

export type LAYER_TILES = LAYER_COMMON &
  TILES & {
    type: LAYER.TILES
    width: number
    height: number
  }

export type SPRITES_SPRITE = {
  // id: string
  x: number
  y: number
  char: number
  color: number
  bg: number
}

export type LAYER_SPRITES = LAYER_COMMON & {
  type: LAYER.SPRITES
  sprites: SPRITES_SPRITE[]
}

export enum PANEL_EDGE {
  START,
  LEFT,
  RIGHT,
  TOP,
  BOTTOM,
}

export const PANEL_EDGE_MAP: Record<string, PANEL_EDGE> = {
  start: PANEL_EDGE.START,
  left: PANEL_EDGE.LEFT,
  right: PANEL_EDGE.RIGHT,
  top: PANEL_EDGE.TOP,
  bottom: PANEL_EDGE.BOTTOM,
}

export type PANEL = {
  id: string
  name: string
  edge: PANEL_EDGE
  size: number
}
