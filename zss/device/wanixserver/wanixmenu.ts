import { readvmstatus } from 'zss/device/wanixserver/runtime'
import {
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
    ready: !!system?.isReady,
    vmrunning,
    vm: vmrunning ? vmstatus : null,
    stalled: false,
    sessionkeys: readliveconnectorder(),
    activesessionkey: readactivesessionkey(),
  }
}

export function buildwanixmenureply(): { tape: string } {
  return { tape: buildwanixmenutape(readwanixmenustate()) }
}
