import {
  type E2E_LOADER_NOTIFY,
  boardrunnerinput,
  chipmessage,
  registerinspector,
  vmcli,
  vmgadgetscroll,
  vminspect,
} from 'zss/device/api'
import { modemwritevaluenumber } from 'zss/device/modem'
import { register, registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { runlangcompilebench } from 'zss/feature/lang/langcompilebench'
import type { LangCompileBenchReport } from 'zss/feature/lang/langcompilebench'
import { readnetworkpeerid, readsubscribetopic } from 'zss/feature/netterminal'
import { isjoin } from 'zss/feature/url'
import { panelscrolltolines } from 'zss/gadget/data/panelitemtext'
import { useGadgetClient, useTape, useTerminal } from 'zss/gadget/data/state'
import { INPUT, LAYER_TYPE, paneladdress } from 'zss/gadget/data/types'
import { ptstoarea } from 'zss/mapping/2d'
import {
  type WANIX_SMOKE_REPORT,
  readwanixdiag,
  runwanixsmoke,
  runwanixstdinsmoke,
} from 'zss/testsupport/e2e/wanixrepro'
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
  /** PeerJS id when signaling peer is open; undefined if not connected. */
  getpeerid: () => string | undefined
  /** Join URL hash + topic for pipeline debugging. */
  getjoindiag: () => {
    hash: string
    topic: string
    peerid: string | undefined
    player: string
    isjoin: boolean
  }
  /** Last N terminal log lines (apilog / apierror). */
  getrecentlogs: (limit?: number) => string[]
  /** Tape workstatus badge text (e.g. `run TITLE`). */
  getworkstatus: () => string
  /** Local player sprite from gadget layers, if painted. */
  getplayersprite: () => { x: number; y: number } | undefined
  sendmoveinput: (dir: ZssE2eMoveDir) => void
  /** Toggle inspector on this browser tab (join-safe; avoids host-only CLI). */
  enableinspector: (enabled?: boolean) => void
  /** `chip:batch:<path>` — opens inspect batch menus on host sim. */
  sendbatchchip: (path: string, data?: unknown[]) => void
  /** Write shared panel number (charedit/coloredit/bgedit). */
  writepanelnumber: (chip: string, target: string, value: number) => void
  batchchipforrect: (p1: PT, p2: PT) => string
  /** Sim boot done and gadget snapshot readable. */
  hostsimalive: () => boolean
  runlangcompilebench: (opts?: {
    iterations?: number
    warmup?: number
  }) => Promise<LangCompileBenchReport>
  /** Drop hello.wasm (auto-start sandbox) with scrollback evidence. */
  runwanixsmoke: (deadlinems?: number) => Promise<WANIX_SMOKE_REPORT>
  /** Drop echo_stdin.wasm and send one stdin line. */
  runwanixstdinsmoke: (deadlinems?: number) => Promise<WANIX_SMOKE_REPORT>
  /** Iframe mount + wanixiframehost state snapshot. */
  getwanixdiag: () => ReturnType<typeof readwanixdiag>
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
    getpeerid() {
      return readnetworkpeerid()
    },
    getjoindiag() {
      let hash = ''
      try {
        hash = location.hash.slice(1)
      } catch {
        hash = ''
      }
      return {
        hash,
        topic: readsubscribetopic(),
        peerid: readnetworkpeerid(),
        player: registerreadplayer(),
        isjoin: isjoin(),
      }
    },
    getrecentlogs(limit = 40) {
      const buf = useTerminal.getState().buffer ?? []
      const start = Math.max(0, buf.length - limit)
      return buf.slice(start).map((line) => String(line))
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
    enableinspector(enabled = true) {
      registerinspector(SOFTWARE, registerreadplayer(), enabled)
    },
    sendbatchchip(path: string, data: unknown[] = []) {
      chipmessage(SOFTWARE, registerreadplayer(), 'batch', path, data)
    },
    writepanelnumber(chip: string, target: string, value: number) {
      modemwritevaluenumber(paneladdress(chip, target), value)
    },
    batchchipforrect(p1: PT, p2: PT) {
      return `batch:${ptstoarea(p1, p2)}`
    },
    hostsimalive() {
      try {
        for (let i = 0; i < loaderevents.length; ++i) {
          const e = loaderevents[i]
          if (
            e.phase === 'done' &&
            e.eventname === 'sim:load' &&
            e.format === 'text'
          ) {
            const g = useGadgetClient.getState().gadget
            panelscrolltolines(g.scroll)
            return true
          }
        }
        return false
      } catch {
        return false
      }
    },
    runlangcompilebench(opts) {
      return runlangcompilebench(opts)
    },
    runwanixsmoke(deadlinems) {
      return runwanixsmoke(deadlinems)
    },
    runwanixstdinsmoke(deadlinems) {
      return runwanixstdinsmoke(deadlinems)
    },
    getwanixdiag() {
      return readwanixdiag()
    },
  }
}
