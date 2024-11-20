import { MAYBE_NUMBER } from 'zss/mapping/types'
import { create } from 'zustand'

import { GADGET_STATE } from './types'

export const useGadgetClient = create<{
  desync: boolean
  state: GADGET_STATE
}>((set) => ({
  desync: false,
  state: {
    player: '',
    layers: [],
    layout: [],
    layoutreset: false,
    layoutfocus: '',
  },
}))

export enum TAPE_LOG_LEVEL {
  OFF,
  INFO,
  DEBUG,
}

type TAPE_ROW = [string, string, string, ...any[]]

export const TAPE_MAX_LINES = 128

export enum TAPE_DISPLAY {
  TOP,
  BOTTOM,
  FULL,
  SPLIT_X,
  SPLIT_X_ALT,
  SPLIT_Y,
  SPLIT_Y_ALT,
  RIGHT,
  LEFT,
  MAX,
}

// message controlled state

export const useTape = create<{
  layout: TAPE_DISPLAY
  terminal: {
    open: boolean
    level: TAPE_LOG_LEVEL
    logs: TAPE_ROW[]
  }
  editor: {
    open: boolean
    player: string
    book: string
    page: string
    type: string
    title: string
  }
}>((set) => ({
  layout: TAPE_DISPLAY.BOTTOM,
  terminal: {
    open: false,
    level: TAPE_LOG_LEVEL.INFO,
    logs: [],
  },
  editor: {
    open: false,
    player: '',
    book: '',
    page: '',
    type: '',
    title: '',
  },
}))

export const useTapeTerminal = create<{
  scroll: number
  xcursor: number
  ycursor: number
  xselect: MAYBE_NUMBER
  yselect: MAYBE_NUMBER
  bufferindex: number
  buffer: string[]
}>((set) => ({
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
  scroll: number
  cursor: number
  select: MAYBE_NUMBER
}>((set) => ({
  // need an id for synced store
  id: '',
  // scrolling offset
  scroll: 0,
  // cursor position & selection (text index)
  cursor: 0,
  select: undefined,
}))
