import { BITMAP } from './bitmap'

export const BYTES_PER_COLOR = 3

export const PALETTE_COLOR_RANGE = 63

export type PALETTE_BITMAP = {
  id: string
  count: number
  bitmap: BITMAP
}

export const CHAR_WIDTH = 8
export const CHAR_HEIGHT = 14
export const BYTES_PER_CHAR = CHAR_WIDTH * CHAR_HEIGHT
export const CHARS_PER_ROW = 16

export type CHARSET_BITMAP = {
  id: string
  count: number
  bitmap: BITMAP
}

export enum GADGET_LAYER {
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

export type LAYER_TILES = LAYER_COMMON & {
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
}
