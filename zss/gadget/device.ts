import { create } from 'zustand'

export type DEVICE_DATA = {
  active: boolean
  saferows: number
  insetcols: number
  insetrows: number
  islowrez: boolean
  islandscape: boolean
  sidebaropen: boolean
  keyboardalt: boolean
  keyboardctrl: boolean
  keyboardshift: boolean
  showtouchcontrols: boolean
  /** When true, terminal/editor sync with touchtext input value (mobile + no keyboard). */
  usetouchtextsync: boolean
  checknumbers: string
  wordlist: string[]
  wordlistflag: string
}

export const useDeviceData = create<DEVICE_DATA>(() => ({
  active: true,
  saferows: 1,
  insetcols: 1,
  insetrows: 1,
  islowrez: false,
  islandscape: true,
  sidebaropen: true,
  keyboardalt: false,
  keyboardctrl: false,
  keyboardshift: false,
  showtouchcontrols: false,
  usetouchtextsync: false,
  checknumbers: '',
  wordlist: [],
  wordlistflag: '',
}))
