import { WORD_VALUE } from 'zss/system/chip'
import { UNOBSERVE_FUNC } from 'zss/system/shared'

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

export type TILES = {
  char: number[]
  color: number[]
  bg: number[]
}

export type SPRITE = {
  id?: string
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

export type LAYER =
  | {
      id: string
      type: LAYER_TYPE.BLANK
    }
  | {
      id: string
      type: LAYER_TYPE.TILES
      width: number
      height: number
      char: number[]
      color: number[]
      bg: number[]
    }
  | {
      id: string
      type: LAYER_TYPE.SPRITES
      sprites: SPRITE[]
    }
  | {
      id: string
      type: LAYER_TYPE.DITHER
      alpha: number[]
    }
  | {
      id: string
      type: LAYER_TYPE.MEDIA
      media: string
    }
  | {
      id: string
      type: LAYER_TYPE.CONTROL
      focusx: number
      focusy: number
      focusrange: number
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
