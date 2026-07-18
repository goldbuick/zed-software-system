/**
 * Zustand store for wanixclient (parent / web-main) tracked state.
 * Screens under screens/wanix subscribe via selectors; device writers use setState.
 */

import type { WanixRoomConfig } from 'zss/feature/wanix/wanixroomtypes'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'
import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermgridstate'
import { TAPE_DISPLAY } from 'zss/gadget/data/zustandstores'
import { create } from 'zustand'

export type WanixClientState = {
  roomconfig: WanixRoomConfig
  pendingapplyconfig: WanixRoomConfig | null
  pendingspawn: { taskid: string; cmd: string } | null
  attachedsessionkey: string | null
  /** Last hard/soft attached session; used by re-attach hotkey after detach. */
  lastattachedsessionkey: string | null
  activesessionkey: string | null
  userdetached: boolean
  /** Guest attach panel visibility (independent of tape terminal). */
  attachpanelopen: boolean
  /** Guest attach panel TOP/FULL/BOTTOM (independent of useTape.layout). */
  attachlayout: TAPE_DISPLAY
  termbuffers: Map<string, WanixTermCellsSnapshot & { version: number }>
  opensessions: Set<string>
  termnotifyversion: number
  wanixisready: boolean
  lasthostpushdoc: Record<string, unknown>
  pollactive: boolean
  guestdirty: boolean
  pendingexport: boolean
}

function emptywanixclientstate(): WanixClientState {
  return {
    roomconfig: createidleroomconfig(),
    pendingapplyconfig: null,
    pendingspawn: null,
    attachedsessionkey: null,
    lastattachedsessionkey: null,
    activesessionkey: null,
    userdetached: false,
    attachpanelopen: false,
    attachlayout: TAPE_DISPLAY.TOP,
    termbuffers: new Map(),
    opensessions: new Set(),
    termnotifyversion: 0,
    wanixisready: false,
    lasthostpushdoc: {},
    pollactive: false,
    guestdirty: false,
    pendingexport: false,
  }
}

export const useWanixClient = create<WanixClientState>(() =>
  emptywanixclientstate(),
)

/** Test / idle hook — resets all store-backed wanixclient fields. */
export function resetwanixclientstore(): void {
  useWanixClient.setState(emptywanixclientstate())
}
