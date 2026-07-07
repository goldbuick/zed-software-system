import type {
  WanixMenuState,
  WanixRoomMode,
  WanixTaskSpec,
  WanixMenuVmStatus,
} from 'zss/feature/wanix/wanixroomtypes'
import {
  zssheaderlines,
  zsssectionlines,
  zsstextline,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'

function readwanixcmdbasename(cmd: string): string {
  const trimmed = cmd.replace(/^#ramfs\//, '')
  const parts = trimmed.split('/')
  return parts[parts.length - 1] ?? trimmed
}

export function readwanixtasklabel(task: WanixTaskSpec): string {
  return `${task.id} — ${readwanixcmdbasename(task.cmd)}`
}

export function readwanixheadertitle(mode: WanixRoomMode): string {
  return `WANIX — ${mode}`
}

export function readwanixvmstatusline(vm: WanixMenuVmStatus): string {
  return `${vm.vmid ?? '?'} ${vm.mem ?? '?'} vrid=${vm.vrid ?? '?'}`
}

export function buildwanixmenutape(state: WanixMenuState): string {
  const parts: (string | string[])[] = [
    ...zssheaderlines(readwanixheadertitle(state.config.mode)),
    zsstextline('drop a .wasm or .tgz to run'),
  ]
  if (state.stalled) {
    parts.push(zsstextline('$graywanix starting…'))
  }
  parts.push(...zsssectionlines('Tasks'))
  if (state.config.tasks.length === 0) {
    parts.push(zsstextline('$grayno tasks running'))
  } else {
    for (const task of state.config.tasks) {
      parts.push(
        zsszedlinkline(
          `wanix stop "${task.id}"`,
          `Stop ${readwanixtasklabel(task)}`,
        ),
      )
    }
  }
  parts.push(...zsssectionlines('VMs'))
  if (state.vmrunning && state.vm) {
    parts.push(zsstextline(readwanixvmstatusline(state.vm)))
    parts.push(zsszedlinkline('wanix vm stop', 'Stop Linux VM'))
  } else {
    parts.push(zsszedlinkline('wanix vm', 'Boot Linux in v86'))
  }
  if (state.config.mode !== 'idle') {
    parts.push(...zsssectionlines('Control'))
    parts.push(zsszedlinkline('wanix stop', 'Stop all'))
  }
  parts.push(...zsssectionlines('Sessions'))
  if (state.sessionkeys.length === 0) {
    parts.push(zsstextline('$grayno terminal sessions'))
  } else {
    for (const sessionkey of state.sessionkeys) {
      const attached = sessionkey === state.attachedsessionkey
      const active = sessionkey === state.activesessionkey
      let label = sessionkey
      if (attached && active) {
        label = `* ${sessionkey} (attached, active)`
      } else if (attached) {
        label = `* ${sessionkey} (attached)`
      } else if (active) {
        label = `${sessionkey} (active)`
      }
      parts.push(
        zsszedlinkline(
          `wanix attach "${sessionkey}"`,
          label,
        ),
      )
    }
    if (state.attachedsessionkey) {
      parts.push(zsszedlinkline('wanix detach', 'Detach terminal'))
    }
  }
  parts.push(...zsssectionlines('Remote'))
  parts.push(zsszedlinkline('wanix remote', 'Remote imports (WSS 9P)'))
  parts.push(
    zsstextline(
      '$gray#wanix bridge <ws-url> — export namespace (not wired yet)',
    ),
  )
  return zsstexttape(...parts)
}
