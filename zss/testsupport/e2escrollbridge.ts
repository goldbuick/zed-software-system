import {
  type E2E_LOADER_NOTIFY,
  vmcli,
  vmgadgetscroll,
  vminspect,
} from 'zss/device/api'
import { register, registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { panelscrolltolines } from 'zss/gadget/data/panelitemtext'
import { useGadgetClient, useTape } from 'zss/gadget/data/state'
import type { PT } from 'zss/words/types'

export type ZssE2eScrollSnapshot = {
  scrollname: string
  lines: string[]
}

export type ZssE2eBridge = {
  getscrollsnapshot: () => ZssE2eScrollSnapshot
  /** True after first gadgetclient paint/patch (VM + sim are feeding the UI). */
  isgadgetclientready: () => boolean
  /** Recorded from worker `apie2eloadernotify` via `zss:e2e-loader` events. */
  getloaderevents: () => E2E_LOADER_NOTIFY[]
  clearloaderevents: () => void
  /** `sim:load` reached `phase: done` (common boot path after login ack). */
  hassimloaddone: () => boolean
  inspectorenabled: () => boolean
  runcli: (line: string) => void
  writetestscroll: (name: string, content: string, chip?: string) => void
  runinspect: (p1: PT, p2: PT) => void
}

export function installe2ebridge(): void {
  if (typeof window === 'undefined') {
    return
  }
  const loaderevents: E2E_LOADER_NOTIFY[] = []
  function onloader(ev: Event) {
    const ce = ev as CustomEvent<E2E_LOADER_NOTIFY>
    if (ce.detail && typeof ce.detail === 'object') {
      loaderevents.push(ce.detail)
    }
  }
  window.addEventListener('zss:e2e-loader', onloader)

  const w = window as Window & { __zss_e2e: ZssE2eBridge }
  w.__zss_e2e = {
    getscrollsnapshot() {
      const g = useGadgetClient.getState().gadget
      return {
        scrollname: g.scrollname ?? '',
        lines: panelscrolltolines(g.scroll),
      }
    },
    isgadgetclientready() {
      return useGadgetClient.getState().layercachegen > 0
    },
    getloaderevents() {
      return [...loaderevents]
    },
    clearloaderevents() {
      loaderevents.length = 0
    },
    hassimloaddone() {
      for (let i = 0; i < loaderevents.length; ++i) {
        const e = loaderevents[i]
        if (
          e.phase === 'done' &&
          e.eventname === 'sim:load' &&
          e.format === 'text'
        ) {
          return true
        }
      }
      return false
    },
    inspectorenabled() {
      return useTape.getState().inspector
    },
    runcli(line: string) {
      vmcli(register, registerreadplayer(), line)
    },
    writetestscroll(name: string, content: string, chip?: string) {
      const payload: { scrollname: string; content: string; chip?: string } = {
        scrollname: name,
        content,
      }
      if (chip?.trim()) {
        payload.chip = chip.trim()
      }
      vmgadgetscroll(SOFTWARE, registerreadplayer(), payload)
    },
    runinspect(p1: PT, p2: PT) {
      vminspect(SOFTWARE, registerreadplayer(), p1, p2)
    },
  }
}
