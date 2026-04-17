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
  /** Tier A: hidden input + IME sync (strict touch-primary or ZSS_FORCE_TOUCH_UI). */
  usemobiletextcapture: boolean
  /**
   * Multiplier applied to `viewport.dpr` for board-layer FBO allocation. 1.0 on
   * high-tier GPUs, 0.75 on mid, 0.5 on low-tier / low-rez. Set by `Engine`
   * after `useDetectGPU` resolves; consumed by flat/iso/mode7/fpv views.
   */
  gpudprscale: number
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
  usemobiletextcapture: false,
  gpudprscale: 1,
  checknumbers: '',
  wordlist: [],
  wordlistflag: '',
}))
