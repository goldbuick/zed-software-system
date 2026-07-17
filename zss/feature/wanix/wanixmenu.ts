import type {
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

/** Pure tape builder — wanixserver assembles WanixMenuState from iframe truth. */
export function buildwanixmenutape(state: WanixMenuState): string {
  const parts: (string | string[])[] = []

  parts.push(zssheaderlines(readwanixheadertitle(state.config.mode)))

  if (state.stalled) {
    parts.push(
      zsstextline('$red   menu stale — iframe status timeout, retry #wanix'),
    )
  }

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
    parts.push(zsstextline('$cyan   drop a .wasm or .tgz to start a task'))
  } else {
    for (const task of state.config.tasks) {
      parts.push(
        zsszedlinkline(
          `wanix stop "${task.id}"`,
          `stop $green${readwanixtasklabel(task)}`,
        ),
      )
    }
  }

  if (state.sessionkeys.length > 0) {
    parts.push('$32')
    parts.push(zsssectionlines('attach to session'))
    for (const sessionkey of state.sessionkeys) {
      parts.push(zsszedlinkline(`wanix attach "${sessionkey}"`, sessionkey))
    }
    parts.push(zsszedlinkline('wanix detach', 'detach guest terminal'))
  }

  if (ispresent(state.activesessionkey)) {
    parts.push('$32')
    parts.push(
      zsstextline(
        '$gray drop files $26 input/ for attached processor (see ops/fixtures/wanix README)',
      ),
    )
  }

  parts.push('$32')
  parts.push(zsssectionlines('externals'))
  parts.push(
    zsstextline(
      '$cyan   drop a folder onto cafe to mount live (Chromium FSA)',
    ),
  )
  if (state.fsabinds.length === 0) {
    parts.push(zsstextline('$cyan   (no folder mounts)'))
  } else {
    for (const dst of state.fsabinds) {
      parts.push(zsstextline(`$green   ${dst}`))
    }
  }
  parts.push(zsszedlinkline('wanix remote', 'list remote imports (WSS 9P)'))
  parts.push(
    zsstextline(
      '$cyan   #wanix remote connect <wss-url> [dst] - import namespace',
    ),
  )
  parts.push(
    zsstextline(
      '$cyan   #wanix remote disconnect [dst|id] - remove import',
    ),
  )
  parts.push(
    zsstextline(
      '$cyan   #wanix zedsync <path> - sync peer dir $29 zedcafe (no spaces)',
    ),
  )
  parts.push(
    zsstextline(
      '$cyan   #wanix bridge <ws-url> - export namespace (not wired yet)',
    ),
  )

  return zsstexttape(...parts)
}
