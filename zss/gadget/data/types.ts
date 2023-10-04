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

export type LAYER_SPRITE = {
  id: string
  x: number
  y: number
  char: number
  color: number
  bg: number
}

export type LAYER_SPRITES = LAYER_COMMON & {
  sprites: LAYER_SPRITE[]
}
