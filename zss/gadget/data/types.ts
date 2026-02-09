import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { COLOR, WORD } from 'zss/words/types'

export const FILE_BYTES_PER_CHAR = 14
export const FILE_BYTES_PER_COLOR = 3

export const CHAR_WIDTH = 8
export const CHAR_HEIGHT = 14
export const BYTES_PER_CHAR = CHAR_WIDTH * CHAR_HEIGHT

export const CHARS_PER_ROW = 16
export const CHARS_TOTAL_ROWS = 16

export const PALETTE_COLORS = 16

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
  stat: number
  pid?: string
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
  stats: number[]
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
  mime: string
  media: string | number[]
}

export enum VIEWSCALE {
  FAR = 1,
  MID = 1.5,
  NEAR = 3,
}

export type LAYER_CONTROL = {
  id: string
  type: LAYER_TYPE.CONTROL
  focusx: number
  focusy: number
  focusid: string
  viewscale: VIEWSCALE
  graphics: string
  facing: number
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
    id: `t:${player}:${index}`,
    type: LAYER_TYPE.TILES,
    width,
    height,
    char: arrayof(size, 0),
    color: arrayof(size, 0),
    bg: arrayof(size, bg),
    stats: arrayof(size, 0),
  }
}

export function createsprite(
  player: string,
  index: number,
  id: string,
  char = 1,
  color = 15,
): SPRITE {
  return {
    id: `s:${player}:${index}:${id}`,
    x: 0,
    y: 0,
    char,
    color,
    bg: COLOR.ONCLEAR,
    stat: 0,
  }
}

export function createsprites(player: string, index: number): LAYER_SPRITES {
  return {
    id: `${player}:${index}`,
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
    id: `d:${player}:${index}`,
    type: LAYER_TYPE.DITHER,
    width,
    height,
    alphas: arrayof(size, fill),
  }
}

export function createmedia(
  player: string,
  index: number,
  mime: string,
  media: string | number[],
): LAYER_MEDIA {
  return {
    id: `m:${player}:${index}`,
    type: LAYER_TYPE.MEDIA,
    mime,
    media,
  }
}

export function layersreadmedia(layers: LAYER[]): LAYER[] {
  return layers.filter((layer) => layer.type === LAYER_TYPE.MEDIA)
}

export function createcontrol(player: string, index: number): LAYER_CONTROL {
  return {
    id: `c:${player}:${index}`,
    type: LAYER_TYPE.CONTROL,
    focusx: 0,
    focusy: 0,
    focusid: player,
    viewscale: VIEWSCALE.MID,
    graphics: 'flat',
    facing: 0,
  }
}

export function layersreadcontrol(layers: LAYER[]): {
  width: number
  height: number
  focusx: number
  focusy: number
  viewscale: VIEWSCALE
  graphics: string
  facing: number
} {
  let width = 0
  let height = 0
  let focusx = BOARD_WIDTH * 0.5
  let focusy = BOARD_HEIGHT * 0.5
  let viewscale = VIEWSCALE.MID
  let graphics = 'flat'
  let facing = 0

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
        graphics = layer.graphics
        facing = layer.facing
        break
    }
  })

  return { width, height, focusx, focusy, viewscale, graphics, facing }
}

export type PANEL_ITEM = WORD | WORD[]

export type UNOBSERVE_FUNC = () => void
export type PANEL_SHARED = Record<string, UNOBSERVE_FUNC>

export function paneladdress(chip: string, target: string) {
  return `${chip}:${target}`
}

export type SYNTH_STATE = {
  source: any[]
  fxchain: any
  fx: any[]
  bpm?: number
  playvolume?: number
  bgplayvolume?: number
  ttsvolume?: number
}

export type GADGET_STATE = {
  id: string
  board: string
  exiteast: string
  exitwest: string
  exitnorth: string
  exitsouth: string
  over?: LAYER[]
  under?: LAYER[]
  layers?: LAYER[]
  tickers?: string[]
  scrollname?: string
  scroll?: PANEL_ITEM[]
  sidebar?: PANEL_ITEM[]
  synthstate?: SYNTH_STATE
}

export const INPUT_ALT = 0x0001
export const INPUT_CTRL = 0x0010
export const INPUT_SHIFT = 0x0100

export enum INPUT {
  NONE,
  ALT,
  CTRL,
  SHIFT,
  MOVE_UP,
  MOVE_DOWN,
  MOVE_LEFT,
  MOVE_RIGHT,
  OK_BUTTON,
  CANCEL_BUTTON,
  MENU_BUTTON,
}
