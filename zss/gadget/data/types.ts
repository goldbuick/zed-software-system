export const BYTES_PER_COLOR = 3

export type PALETTE_BYTES = {
  id: string
  count: number
  bytes: Uint8Array
}

export const CHAR_WIDTH = 8
export const CHAR_HEIGHT = 14
export const BYTES_PER_CHAR = CHAR_WIDTH * CHAR_HEIGHT

export type CHARSET_BYTES = {
  id: string
  count: number
  bytes: Uint8Array
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
