import { useRef } from 'react'
import { MAYBE, isequal } from 'zss/mapping/types'
import { PT } from 'zss/words/types'
import { create } from 'zustand'

import { GADGET_STATE, GADGET_ZSS_WORDS, LAYER } from './types'

/** Max board ids kept for exit previews; oldest insertion evicted first. */
export const LAYERCACHE_MAX_ENTRIES = 64

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
  map.set(board, layers)
  while (map.size > LAYERCACHE_MAX_ENTRIES) {
    const oldest = map.keys().next().value!
    map.delete(oldest)
  }
  return map
}

export const useGadgetClient = create<{
  gadget: GADGET_STATE
  /** Last applied jsonsync rev for `gadget:<player>`; avoids stale snapshots wiping local scroll. */
  gadgetsyncrev: number
  /** True after we applied a non-empty scroll from sync; stale higher-rev empties merge until user closes. */
  gadgetscrolllocal: boolean
  layercachemap: Map<string, LAYER[]>
  zsswords: GADGET_ZSS_WORDS
}>(() => ({
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
  gadget: {
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
  },
  gadgetsyncrev: -1,
  gadgetscrolllocal: false,
  layercachemap: new Map(),
}))

export type TAPE_ROW = [string, string, ...any[]]

export const TAPE_MAX_LINES = 256

export enum TAPE_DISPLAY {
  TOP,
  FULL,
  BOTTOM,
  MAX,
}

export const useTape = create<{
  layout: TAPE_DISPLAY
  inspector: boolean
  quickterminal: boolean
  autocompleteindex: number
  toast: string
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
  quickterminal: false,
  autocompleteindex: 0,
  toast: '',
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
      quickterminal: false,
      toast: '',
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

export const useEditorSearch = create<{
  searchopen: boolean
  searchquery: string
  searchmatchindex: number
  searchopenui: () => void
  searchclose: () => void
  searchsetquery: (query: string) => void
  searchsetmatchindex: (index: number) => void
}>((set) => ({
  searchopen: false,
  searchquery: '',
  searchmatchindex: 0,
  searchopenui() {
    set({ searchopen: true, searchmatchindex: 0 })
  },
  searchclose() {
    set({ searchopen: false })
  },
  searchsetquery(query: string) {
    set({ searchquery: query, searchmatchindex: 0 })
  },
  searchsetmatchindex(index: number) {
    set({ searchmatchindex: index })
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

export function useEqual<S, U>(selector: (state: S) => U): (state: S) => U {
  const prev = useRef<U>(null as U)
  return (state) => {
    const next = selector(state)
    return (
      prev.current === undefined || next === undefined
        ? prev.current === next
        : isequal(prev.current, next)
    )
      ? prev.current
      : (prev.current = next)
  }
}
