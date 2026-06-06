import {
  type E2E_LOADER_NOTIFY,
  boardrunnerinput,
  vmcli,
  vmgadgetscroll,
  vminspect,
} from 'zss/device/api'
import { register, registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { readsubscribetopic } from 'zss/feature/netterminal'
import { panelscrolltolines } from 'zss/gadget/data/panelitemtext'
import { useGadgetClient, useTape } from 'zss/gadget/data/state'
import { INPUT, LAYER_TYPE } from 'zss/gadget/data/types'
import type { PT } from 'zss/words/types'

export type ZssE2eMoveDir = 'left' | 'right' | 'up' | 'down'

const MOVE_INPUT: Record<ZssE2eMoveDir, INPUT> = {
  left: INPUT.MOVE_LEFT,
  right: INPUT.MOVE_RIGHT,
  up: INPUT.MOVE_UP,
  down: INPUT.MOVE_DOWN,
}

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
  /** Host `#joincode` topic; empty until netterminal publishes. */
  getjointopic: () => string
  /** Tape workstatus badge text (e.g. `run TITLE`). */
  getworkstatus: () => string
  /** Local player sprite from gadget layers, if painted. */
  getplayersprite: () => { x: number; y: number } | undefined
  sendmoveinput: (dir: ZssE2eMoveDir) => void
}

export function installe2ebridge(): void {
  if (typeof window === 'undefined') {
    return
  }
  const w0 = window as Window & { __zss_e2e?: ZssE2eBridge }
  if (w0.__zss_e2e) {
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

  w0.__zss_e2e = {
    getscrollsnapshot() {
      const g = useGadgetClient.getState().gadget
      return {
        scrollname: g.scrollname ?? '',
        lines: panelscrolltolines(g.scroll),
      }
    },
    isgadgetclientready() {
      const { gadget } = useGadgetClient.getState()
      return gadget.id !== '' || (gadget.layers?.length ?? 0) > 0
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
    getjointopic() {
      return readsubscribetopic()
    },
    getworkstatus() {
      return useTape.getState().workstatus
    },
    getplayersprite() {
      const player = registerreadplayer()
      const layers = useGadgetClient.getState().gadget.layers ?? []
      for (let i = 0; i < layers.length; ++i) {
        const layer = layers[i]
        if (layer.type !== LAYER_TYPE.SPRITES) {
          continue
        }
        const sprites = layer.sprites
        for (let j = 0; j < sprites.length; ++j) {
          const sprite = sprites[j]
          if (sprite.pid === player) {
            return { x: sprite.x, y: sprite.y }
          }
        }
      }
      return undefined
    },
    sendmoveinput(dir: ZssE2eMoveDir) {
      boardrunnerinput(SOFTWARE, registerreadplayer(), MOVE_INPUT[dir], 0)
    },
  }
}
