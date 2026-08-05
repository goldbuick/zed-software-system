import { create } from 'zustand'

export type TOUCHPAD_ZONE = {
  left: number
  top: number
  width: number
  height: number
}

export type TOUCHPADS = {
  move: TOUCHPAD_ZONE
  shoot: TOUCHPAD_ZONE
}

export type DEVICE_DATA = {
  active: boolean
  saferows: number
  insetcols: number
  insetrows: number
  islowrez: boolean
  islandscape: boolean
  sidebaropen: boolean
  /** Portrait sidebar PanelSlide exit in progress; layout stays reserved until done. */
  sidebarclosing: boolean
  keyboardalt: boolean
  keyboardctrl: boolean
  keyboardshift: boolean
  showtouchcontrols: boolean
  /** Tier A: hidden input + IME sync (strict touch-primary). */
  usemobiletextcapture: boolean
  /** Tier A capture textarea focused (soft keyboard / typing). */
  textcapturefocused: boolean
  /** Pixel rects for DOM MOVE/SHOOT touchpads; null when touch UI is off. */
  touchpads: TOUCHPADS | null
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
  sidebarclosing: false,
  keyboardalt: false,
  keyboardctrl: false,
  keyboardshift: false,
  showtouchcontrols: false,
  usemobiletextcapture: false,
  textcapturefocused: false,
  touchpads: null,
  checknumbers: '',
  wordlist: [],
  wordlistflag: '',
}))
