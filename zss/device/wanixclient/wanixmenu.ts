import { SOFTWARE } from 'zss/device/session'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  WanixMenuState,
  WanixMenuVmStatus,
  WanixRoomMode,
  WanixTaskSpec,
} from 'zss/feature/wanix/wanixroomtypes'
import {
  zssheaderlines,
  zsssectionlines,
  zsstextline,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'
import { ispresent } from 'zss/mapping/types'

import { readwanixmenustate } from './wanixroom'

function readwanixcmdbasename(cmd: string): string {
  const trimmed = cmd.replace(/^#ramfs\//, '')
  const parts = trimmed.split('/')
  return parts[parts.length - 1] ?? trimmed
}

export function readwanixtasklabel(task: WanixTaskSpec): string {
  return `${task.id} — ${readwanixcmdbasename(task.cmd)}`
}

function readwanixheadertitle(mode: WanixRoomMode): string {
  return `WANIX $YELLOW${mode}`
}

function readwanixvmstatusline(vm: WanixMenuVmStatus): string {
  return `${vm.vmid ?? '?'} ${vm.mem ?? '?'} vrid=${vm.vrid ?? '?'}`
}

export function buildwanixmenutape(state: WanixMenuState): string {
  const parts: (string | string[])[] = []

  // header
  parts.push(zssheaderlines(readwanixheadertitle(state.config.mode)))

  // notice line
  if (state.stalled) {
    parts.push(
      zsstextline('$red   menu stale — iframe RPC timeout, retry #wanix'),
    )
  }

  // list vm state
  if (ispresent(state.vm)) {
    parts.push(
      zsszedlinkline(
        `wanix vm stop`,
        `stop $green${readwanixvmstatusline(state.vm)}`,
      ),
    )
  } else {
    parts.push(zsszedlinkline(`wanix vm`, `boot linux in v86`))
  }

  if (state.config.tasks.length === 0) {
    // show notice line
    parts.push(zsstextline('$cyan   drop a .wasm or .tgz to start a task'))
  } else {
    // list tasks state
    for (const task of state.config.tasks) {
      parts.push(
        zsszedlinkline(
          `wanix stop "${task.id}"`,
          `stop $green${readwanixtasklabel(task)}`,
        ),
      )
    }
  }

  // list sessions
  if (state.sessionkeys.length > 0) {
    parts.push('$32')
    parts.push(zsssectionlines('attach to session'))
    for (const sessionkey of state.sessionkeys) {
      parts.push(zsszedlinkline(`wanix attach "${sessionkey}"`, sessionkey))
    }
  }

  if (ispresent(state.attachedsessionkey)) {
    parts.push('$32')
    parts.push(
      zsstextline(
        '$gray drop files → input/ for attached processor (see ops/fixtures/wanix README)',
      ),
    )
  }

  // list remote imports
  parts.push('$32')
  parts.push(zsssectionlines('externals'))
  parts.push(zsszedlinkline('wanix remote', 'Remote imports (WSS 9P)'))
  parts.push(
    zsstextline(
      '$cyan   #wanix bridge <ws-url> — export namespace (not wired yet)',
    ),
  )

  return zsstexttape(...parts)
}

export async function showwanixmenu(player: string): Promise<void> {
  const state = await readwanixmenustate()
  terminalwritelines(SOFTWARE, player, buildwanixmenutape(state))
}
