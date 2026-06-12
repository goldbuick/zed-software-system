import {
  apierror,
  wanixrun,
  wanixstart,
  wanixstatus,
  wanixstop,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { zssheaderlines, zsstexttape } from 'zss/feature/zsstextui'
import { FIRMWARE } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { READ_CONTEXT, readargs, readargsuntilend } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

function showwanixhelp(player: string) {
  terminalwritelines(
    SOFTWARE,
    player,
    zsstexttape(
      zssheaderlines('wanix'),
      '$gray#wanix$white — on-demand WASI sandbox (hidden iframe)',
      '$7 #wanix start',
      '$7 #wanix stop',
      '$7 #wanix run hello.wasm',
      '$7 #wanix status',
    ),
  )
}

export function registerwanixcommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'wanix',
    [ARG_TYPE.MAYBE_NAME, 'bare: wanixspace; start/stop/run WASI one-shots'],
    (_, words) => {
      const [action, ii] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      const player = READ_CONTEXT.elementfocus
      if (!ispresent(action)) {
        wanixstatus(SOFTWARE, player)
        showwanixhelp(player)
        return 0
      }
      switch (NAME(action)) {
        case 'start':
          wanixstart(SOFTWARE, player)
          break
        case 'stop':
          wanixstop(SOFTWARE, player)
          break
        case 'run': {
          const [cmdwords] = readargsuntilend(words, ii, ARG_TYPE.NAME)
          const cmd = cmdwords.join(' ').trim()
          if (!cmd) {
            apierror(SOFTWARE, player, 'wanix', '#wanix run <command…>')
            break
          }
          wanixrun(SOFTWARE, player, cmd)
          break
        }
        case 'status':
          wanixstatus(SOFTWARE, player)
          break
        default:
          showwanixhelp(player)
          break
      }
      return 0
    },
  )
}
