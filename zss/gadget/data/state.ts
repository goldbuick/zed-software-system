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
      ? (prev.current as U)
      : (prev.current = next)
  }
}

export const useGadgetClient = create<{
  desync: boolean
  gadget: GADGET_STATE
}>(() => ({
  desync: false,
  gadget: {
    id: '',
    layers: [],
    scroll: [],
    sidebar: [],
  },
}))

export enum TAPE_LOG_LEVEL {
  OFF,
  INFO,
  DEBUG,
}

export type TAPE_ROW = [string, string, string, ...any[]]

export const TAPE_MAX_LINES = 128

export enum TAPE_DISPLAY {
  TOP,
  FULL,
  BOTTOM,
  SPLIT_Y,
  SPLIT_Y_ALT,
  MAX,
}

// message controlled state

export const useTape = create<{
  layout: TAPE_DISPLAY
  inspector: boolean
  terminal: {
    open: boolean
    level: TAPE_LOG_LEVEL
    logs: TAPE_ROW[]
  }
  editor: {
    open: boolean
    player: string
    book: string
    path: string[]
    type: string
    title: string
  }
}>(() => ({
  layout: TAPE_DISPLAY.TOP,
  inspector: islocked(),
  terminal: {
    open: true,
    level: TAPE_LOG_LEVEL.INFO,
    logs: [],
  },
  editor: {
    open: false,
    player: '',
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
