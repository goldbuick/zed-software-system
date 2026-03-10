import { useRef } from 'react'
import { FORMAT_OBJECT } from 'zss/feature/format'
import { MAYBE, isequal } from 'zss/mapping/types'
import { PT } from 'zss/words/types'
import { create } from 'zustand'

import { GADGET_STATE, GADGET_ZSS_WORDS, LAYER } from './types'

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

export const useGadgetClient = create<{
  desync: boolean
  gadget: GADGET_STATE
  layercache: Record<string, LAYER[]>
  slim: FORMAT_OBJECT
  zsswords: GADGET_ZSS_WORDS
}>(() => ({
  desync: false,
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
  },
  gadget: {
    id: '',
    board: '',
    exiteast: '',
    exitwest: '',
    exitnorth: '',
    exitsouth: '',
    layers: [],
    tickers: [],
    scrollname: '',
    scroll: [],
    sidebar: [],
  },
  layercache: {},
  slim: [],
}))

export type TAPE_ROW = [string, string, ...any[]]

export const TAPE_MAX_LINES = 256

export enum TAPE_DISPLAY {
  TOP,
  FULL,
  BOTTOM,
  MAX,
}

// message controlled state

export const useTape = create<{
  layout: TAPE_DISPLAY
  inspector: boolean
  quickterminal: boolean
  autocompleteindex: number
  toast: string
  terminal: {
    open: boolean
    logs: string[]
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
    info: [],
    logs: [],
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
  // panning offset
  pan: 0,
  // scrolling offset
  scroll: 0,
  // cursor position & selection
  xcursor: 0,
  ycursor: 0,
  xselect: undefined,
  yselect: undefined,
  // input history
  bufferindex: 0,
  buffer: [''],
  reset() {
    set({
      // panning offset
      pan: 0,
      // scrolling offset
      scroll: 0,
      // cursor position & selection
      xcursor: 0,
      ycursor: 0,
      xselect: undefined,
      yselect: undefined,
      // input history
      bufferindex: 0,
      buffer: [''],
    })
  },
}))

export const useEditor = create<{
  xscroll: number
  yscroll: number
  cursor: number
  select: MAYBE<number>
  reset: () => void
}>((set) => ({
  // scrolling offset
  xscroll: 0,
  yscroll: 0,
  // cursor position & selection (text index)
  cursor: 0,
  select: undefined,
  reset() {
    set({
      // scrolling offset
      xscroll: 0,
      yscroll: 0,
      // cursor position & selection (text index)
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
  // matches from findany
  pts: [],
  // cursor position & selection board indexes
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
