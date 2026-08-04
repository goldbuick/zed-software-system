import type { TICKER } from 'zss/gadget/data/types'
import { create } from 'zustand'

export type TICKER_ANCHOR = {
  sx: number
  sy: number
  visible: boolean
}

export type TICKER_SLOT = {
  tilex: number
  tiley: number
}

export type TICKER_TAIL_DIR = 'up' | 'down' | 'left' | 'right' | 'none'

export type TICKER_BUBBLE = {
  id: string
  tilex: number
  tiley: number
  width: number
  height: number
  text: string
  taildir: TICKER_TAIL_DIR
  /** Integer tile for side-of-bubble placement (row/col of the tip). */
  tailx: number
  taily: number
  /** Continuous speaker anchor (left-edge tile coords) for sub-tile tail centering. */
  anchorsx: number
  anchorsy: number
}

type TickerLayoutState = {
  anchors: Record<string, TICKER_ANCHOR>
  /** Overlay tiles occupied by visible player sprites (pid). */
  playertiles: TICKER_SLOT[]
  slots: Record<string, TICKER_SLOT>
  bubbles: TICKER_BUBBLE[]
  strip: TICKER[]
  setanchors: (
    anchors: Record<string, TICKER_ANCHOR>,
    playertiles?: TICKER_SLOT[],
  ) => void
  setlayout: (
    bubbles: TICKER_BUBBLE[],
    strip: TICKER[],
    slots: Record<string, TICKER_SLOT>,
  ) => void
  clear: () => void
}

function anchorsequal(
  a: Record<string, TICKER_ANCHOR>,
  b: Record<string, TICKER_ANCHOR>,
): boolean {
  const akeys = Object.keys(a)
  const bkeys = Object.keys(b)
  if (akeys.length !== bkeys.length) {
    return false
  }
  for (let i = 0; i < akeys.length; ++i) {
    const key = akeys[i]
    const av = a[key]
    const bv = b[key]
    if (av.sx !== bv?.sx || av.sy !== bv.sy || av.visible !== bv.visible) {
      return false
    }
  }
  return true
}

function slotsequal(
  a: Record<string, TICKER_SLOT>,
  b: Record<string, TICKER_SLOT>,
): boolean {
  const akeys = Object.keys(a)
  const bkeys = Object.keys(b)
  if (akeys.length !== bkeys.length) {
    return false
  }
  for (let i = 0; i < akeys.length; ++i) {
    const key = akeys[i]
    const av = a[key]
    const bv = b[key]
    if (av.tilex !== bv?.tilex || av.tiley !== bv.tiley) {
      return false
    }
  }
  return true
}

function playertilesequal(a: TICKER_SLOT[], b: TICKER_SLOT[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; ++i) {
    if (a[i].tilex !== b[i].tilex || a[i].tiley !== b[i].tiley) {
      return false
    }
  }
  return true
}

function bubbleshallowequal(a: TICKER_BUBBLE[], b: TICKER_BUBBLE[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; ++i) {
    const av = a[i]
    const bv = b[i]
    if (
      av.id !== bv.id ||
      av.tilex !== bv.tilex ||
      av.tiley !== bv.tiley ||
      av.width !== bv.width ||
      av.height !== bv.height ||
      av.text !== bv.text ||
      av.taildir !== bv.taildir ||
      av.tailx !== bv.tailx ||
      av.taily !== bv.taily ||
      av.anchorsx !== bv.anchorsx ||
      av.anchorsy !== bv.anchorsy
    ) {
      return false
    }
  }
  return true
}

function stripshallowequal(a: TICKER[], b: TICKER[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; ++i) {
    if (a[i].id !== b[i].id || a[i].text !== b[i].text) {
      return false
    }
  }
  return true
}

export const useTickerLayout = create<TickerLayoutState>((set, get) => ({
  anchors: {},
  playertiles: [],
  slots: {},
  bubbles: [],
  strip: [],
  setanchors: (anchors, playertiles = []) => {
    const prev = get()
    if (
      anchorsequal(prev.anchors, anchors) &&
      playertilesequal(prev.playertiles, playertiles)
    ) {
      return
    }
    set({ anchors, playertiles })
  },
  setlayout: (bubbles, strip, slots) => {
    const prev = get()
    if (
      bubbleshallowequal(prev.bubbles, bubbles) &&
      stripshallowequal(prev.strip, strip) &&
      slotsequal(prev.slots, slots)
    ) {
      return
    }
    set({ bubbles, strip, slots })
  },
  clear: () => {
    const prev = get()
    if (
      Object.keys(prev.anchors).length === 0 &&
      prev.playertiles.length === 0 &&
      Object.keys(prev.slots).length === 0 &&
      prev.bubbles.length === 0 &&
      prev.strip.length === 0
    ) {
      return
    }
    set({
      anchors: {},
      playertiles: [],
      slots: {},
      bubbles: [],
      strip: [],
    })
  },
}))
