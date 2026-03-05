import { useRef } from 'react'
import { FORMAT_OBJECT } from 'zss/feature/format'
import { MAYBE, isequal } from 'zss/mapping/types'
import { PT } from 'zss/words/types'
import { create } from 'zustand'

import { GADGET_STATE, LAYER } from './types'

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
  zsswords: {
    cli: string[]
    loader: string[]
    runtime: string[]
    flags: string[]
    stats: string[]
    kinds: string[]
    altkinds: string[]
    colors: string[]
    dirs: string[]
    dirmods: string[]
    exprs: string[]
  }
}>(() => ({
  desync: false,
  zsswords: {
    cli: [],
    loader: [],
    runtime: [],
    flags: [],
    stats: [],
    kinds: [],
    altkinds: [],
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
  SPLIT_X,
  MAX,
}

// message controlled state

export const useTape = create<{
  layout: TAPE_DISPLAY
  inspector: boolean
  quickterminal: boolean
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
