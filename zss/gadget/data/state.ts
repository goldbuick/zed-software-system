import { useRef } from 'react'
import { isequal, MAYBE } from 'zss/mapping/types'
import { islocked } from 'zss/mapping/url'
import { create } from 'zustand'

import { GADGET_STATE } from './types'

export function useEqual<S, U>(selector: (state: S) => U): (state: S) => U {
  const prev = useRef<U>()
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
    layers: [],
    scroll: [],
    sidebar: [],
  },
}))

export type TAPE_ROW = [string, string, ...any[]]

export const TAPE_MAX_LINES = 128

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
    info: string[]
    logs: string[]
  }
  editor: {
    open: boolean
    book: string
    path: string[]
    type: string
    title: string
  }
}>(() => ({
  layout: TAPE_DISPLAY.TOP,
  inspector: islocked(),
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
}))

export const useTapeTerminal = create<{
  scroll: number
  xcursor: number
  ycursor: number
  xselect: MAYBE<number>
  yselect: MAYBE<number>
  bufferindex: number
  buffer: string[]
}>(() => ({
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
}))

export const useTapeEditor = create<{
  id: string
  xscroll: number
  yscroll: number
  cursor: number
  select: MAYBE<number>
}>(() => ({
  // need an id for synced store
  id: '',
  // scrolling offset
  xscroll: 0,
  yscroll: 0,
  // cursor position & selection (text index)
  cursor: 0,
  select: undefined,
}))

export const useTapeInspector = create<{
  cursor: MAYBE<number>
  select: MAYBE<number>
}>(() => ({
  // cursor position & selection board indexes
  cursor: undefined,
  select: undefined,
}))
