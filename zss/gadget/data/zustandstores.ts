import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'
import { PT } from 'zss/words/types'
import { create } from 'zustand'

import { GADGET_STATE, GADGET_ZSS_WORDS, LAYER, LAYER_TYPE } from './types'

export function emptygadgetstate(): GADGET_STATE {
  return deepcopy({
    id: '',
    board: '',
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
    tickers: [],
    scrollname: '',
    scroll: [],
    sidebar: [],
  })
}

export function ismaybeblankgadgetstate(state: MAYBE<GADGET_STATE>): boolean {
  if (!ispresent(state)) {
    return true
  }
  return (
    !state.id &&
    !state.board &&
    (state.layers?.length ?? 0) === 0 &&
    (state.scroll?.length ?? 0) === 0 &&
    (state.sidebar?.length ?? 0) === 0
  )
}

/** Max board ids kept for exit previews; oldest insertion evicted first. */
export const LAYERCACHE_MAX_ENTRIES = 64

/** Strip player avatars from layers (sprites with `pid`); used only for layercachemap, not live gadget.layers. */
export function layersstrippedplayersprites(layers: LAYER[]): LAYER[] {
  return layers.map((layer) => {
    if (layer.type !== LAYER_TYPE.SPRITES) {
      return layer
    }
    const sprites = layer.sprites.filter((s) => !ispresent(s.pid))
    if (sprites.length === layer.sprites.length) {
      return layer
    }
    return { ...layer, sprites }
  })
}

export function applylayercacheupdate(
  map: Map<string, LAYER[]>,
  board: string,
  layers: LAYER[],
): Map<string, LAYER[]> {
  if (!board) {
    return map
  }
  if (map.has(board)) {
    map.delete(board)
  }
  map.set(board, layersstrippedplayersprites(layers))
  while (map.size > LAYERCACHE_MAX_ENTRIES) {
    const oldest = map.keys().next().value!
    map.delete(oldest)
  }
  return map
}

export const useGadgetClient = create<{
  gadget: GADGET_STATE
  layercachemap: Map<string, LAYER[]>
  zsswords: GADGET_ZSS_WORDS
}>(() => ({
  gadget: emptygadgetstate(),
  layercachemap: new Map(),
  zsswords: {
    langcommands: {},
    clicommands: {},
    loadercommands: {},
    runtimecommands: {},
    flags: [],
    statsboard: [],
    statshelper: [],
    statssender: [],
    statsinteraction: [],
    statsboolean: [],
    statsconfig: [],
    objects: [],
    terrains: [],
    boards: [],
    palettes: [],
    charsets: [],
    loaders: [],
    categories: [],
    colors: [],
    dirs: [],
    dirmods: [],
    exprs: [],
    commandargmeta: {},
  },
}))

export type TAPE_ROW = [string, string, ...any[]]

export const TAPE_MAX_LINES = 256

export enum TAPE_DISPLAY {
  TOP,
  FULL,
  BOTTOM,
  MAX,
}

export type TERMINAL_MODE = 'cli' | 'quick' | 'attached'

export const useTape = create<{
  layout: TAPE_DISPLAY
  inspector: boolean
  perfmonitor: boolean
  terminalmode: TERMINAL_MODE
  autocompleteindex: number
  toast: string
  workstatus: string
  terminal: {
    open: boolean
    logs: string[]
    /** Terminal bookmarks from IDB; prepended when rendering logs. */
    pinlines: string[]
    /** Same order / length as `pinlines`; used to remove pins from the tape. */
    pinids: string[]
  }
  editor: {
    open: boolean
    book: string
    path: string[]
    type: string
    title: string
  }
  reset: () => void
}>((set) => ({
  layout: TAPE_DISPLAY.TOP,
  inspector: false,
  perfmonitor: false,
  terminalmode: 'cli',
  autocompleteindex: 0,
  toast: '',
  workstatus: '',
  terminal: {
    open: true,
    logs: [],
    pinlines: [],
    pinids: [],
  },
  editor: {
    open: false,
    book: '',
    path: [],
    type: '',
    title: '',
  },
  reset() {
    set({
      layout: TAPE_DISPLAY.TOP,
      inspector: false,
      perfmonitor: false,
      terminalmode: 'cli',
      toast: '',
      workstatus: '',
      terminal: {
        open: true,
        logs: [],
        pinlines: [],
        pinids: [],
      },
      editor: {
        open: false,
        book: '',
        path: [],
        type: '',
        title: '',
      },
    })
  },
}))

export const useTerminal = create<{
  pan: number
  scroll: number
  xcursor: number
  ycursor: number
  xselect: MAYBE<number>
  yselect: MAYBE<number>
  bufferindex: number
  buffer: string[]
  reset: () => void
}>((set) => ({
  pan: 0,
  scroll: 0,
  xcursor: 0,
  ycursor: 0,
  xselect: undefined,
  yselect: undefined,
  bufferindex: 0,
  buffer: [''],
  reset() {
    set({
      pan: 0,
      scroll: 0,
      xcursor: 0,
      ycursor: 0,
      xselect: undefined,
      yselect: undefined,
      bufferindex: 0,
      buffer: [''],
    })
  },
}))

export const useEditor = create<{
  startline: number
  xscroll: number
  yscroll: number
  cursor: number
  select: MAYBE<number>
  reset: () => void
}>((set) => ({
  startline: 0,
  xscroll: 0,
  yscroll: 0,
  cursor: 0,
  select: undefined,
  reset() {
    set({
      startline: 0,
      xscroll: 0,
      yscroll: 0,
      cursor: 0,
      select: undefined,
    })
  },
}))

export const useInspector = create<{
  pts: PT[]
  cursor: MAYBE<number>
  select: MAYBE<number>
  reset: () => void
}>((set) => ({
  pts: [],
  cursor: undefined,
  select: undefined,
  reset() {
    set({
      pts: [],
      cursor: undefined,
      select: undefined,
    })
  },
}))
