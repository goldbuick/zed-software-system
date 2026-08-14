import type { DEVICE } from 'zss/device'
import { apierror, apilog, vmcli } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import type { MESSAGE } from 'zss/device/types'
import { showmediaqueuescroll } from 'zss/feature/mediaqueue/menu'
import {
  mediaqueuecleardrafturl,
  mediaqueuereaddrafturl,
} from 'zss/feature/mediaqueue/urlfield'
import { isarray, isstring } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

function readstringarg(message: MESSAGE): string | undefined {
  if (isarray(message.data)) {
    const first = (message.data as unknown[])[0]
    if (isstring(first)) {
      return first
    }
  } else if (isstring(message.data)) {
    return message.data
  }
  return undefined
}

/** Scroll chip actions for mediaqueue (keep-open via `hyperlink next`). */
export function handlemediaqueuepanel(
  vm: DEVICE,
  message: MESSAGE,
  path: string,
): void {
  const player = message.player
  switch (NAME(path)) {
    case 'addurl': {
      const url = mediaqueuereaddrafturl()
      if (!url) {
        apierror(SOFTWARE, player, 'mediaqueue', 'enter a url first')
        return
      }
      vmcli(vm, player, `#mediaqueue add ${url}`)
      mediaqueuecleardrafturl()
      showmediaqueuescroll(player)
      break
    }
    case 'goto': {
      const raw = readstringarg(message)
      const index = Number(raw)
      if (!Number.isFinite(index)) {
        apierror(SOFTWARE, player, 'mediaqueue', 'goto needs an index')
        return
      }
      vmcli(vm, player, `#mediaqueue goto ${index}`)
      showmediaqueuescroll(player)
      break
    }
    case 'next':
      vmcli(vm, player, '#mediaqueue next')
      showmediaqueuescroll(player)
      break
    case 'clear':
      vmcli(vm, player, '#mediaqueue clear')
      showmediaqueuescroll(player)
      break
    case 'call':
      vmcli(vm, player, '#mediaqueue call')
      showmediaqueuescroll(player)
      break
    case 'stop':
      vmcli(vm, player, '#mediaqueue stop')
      showmediaqueuescroll(player)
      break
    case 'refresh':
      showmediaqueuescroll(player)
      apilog(SOFTWARE, player, 'mediaqueue scroll refreshed')
      break
    default:
      break
  }
}
