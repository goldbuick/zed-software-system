import { readfsabinds, readvmstatus } from 'zss/device/wanixserver/runtime'
import {
  iswanixelementready,
  readactivesessionkey,
  readliveconnectorder,
  readroomconfig,
  readwanixsystem,
} from 'zss/device/wanixserver/state'
import { buildwanixmenutape } from 'zss/feature/wanix/wanixmenu'
import type { WanixMenuState } from 'zss/feature/wanix/wanixroomtypes'

export function readwanixmenustate(): WanixMenuState {
  const config = readroomconfig()
  const system = readwanixsystem()
  const vmstatus = readvmstatus()
  const vmrunning = !!vmstatus.running
  return {
    config,
    ready: iswanixelementready(system),
    vmrunning,
    vm: vmrunning ? vmstatus : null,
    stalled: false,
    sessionkeys: readliveconnectorder(),
    activesessionkey: readactivesessionkey(),
    fsabinds: readfsabinds(),
  }
}

export function buildwanixmenureply(): { tape: string } {
  return { tape: buildwanixmenutape(readwanixmenustate()) }
}
