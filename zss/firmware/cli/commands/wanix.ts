import {
  apierror,
  apilog,
  wanixattach,
  wanixdetach,
  wanixshow,
  wanixstop,
  wanixtermdump,
  wanixtermstatus,
  wanixvmstart,
  wanixvmstop,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

function wanixstublog(player: string, message: string) {
  apilog(SOFTWARE, player, `wanix stub: ${message}`)
}

export function registerwanixcommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'wanix',
    [
      ARG_TYPE.MAYBE_NAME,
      'bare: drop .wasm/.tgz to run; menu for tasks and vms',
    ],
    (_, words) => {
      const [action, arg] = readargs(words, 0, [
        ARG_TYPE.MAYBE_NAME,
        ARG_TYPE.MAYBE_NAME,
      ])
      const player = READ_CONTEXT.elementfocus
      if (!ispresent(action)) {
        wanixshow(SOFTWARE, player)
        return 0
      }
      switch (NAME(action)) {
        case 'vm': {
          const sub = ispresent(arg) ? NAME(arg) : undefined
          if (sub === 'stop') {
            const [stoparg] = readargs(words, 2, [ARG_TYPE.MAYBE_NAME])
            wanixvmstop(
              SOFTWARE,
              player,
              ispresent(stoparg) ? NAME(stoparg) : undefined,
            )
          } else {
            wanixvmstart(
              SOFTWARE,
              player,
              ispresent(arg) ? NAME(arg) : undefined,
            )
          }
          break
        }
        case 'stop': {
          const [stoparg] = readargs(words, 1, [ARG_TYPE.MAYBE_NAME])
          wanixstop(
            SOFTWARE,
            player,
            ispresent(stoparg) ? NAME(stoparg) : undefined,
          )
          break
        }
        case 'detach':
          wanixdetach(SOFTWARE, player)
          break
        case 'attach':
          wanixattach(SOFTWARE, player, ispresent(arg) ? NAME(arg) : undefined)
          break
        case 'term': {
          const sub = ispresent(arg) ? NAME(arg) : undefined
          if (!ispresent(sub)) {
            apierror(
              SOFTWARE,
              player,
              'wanix',
              'usage: #wanix term dump [session] | #wanix term status',
            )
            break
          }
          if (NAME(sub) === 'dump') {
            const [sessionkey, tailraw] = readargs(words, 2, [
              ARG_TYPE.MAYBE_NAME,
              ARG_TYPE.MAYBE_NUMBER,
            ])
            const tail =
              typeof tailraw === 'number' && tailraw > 0
                ? Math.floor(tailraw)
                : undefined
            wanixtermdump(
              SOFTWARE,
              player,
              ispresent(sessionkey) ? NAME(sessionkey) : undefined,
              tail,
            )
            break
          }
          if (NAME(sub) === 'status') {
            wanixtermstatus(SOFTWARE, player)
            break
          }
          apierror(
            SOFTWARE,
            player,
            'wanix',
            'usage: #wanix term dump [session] [tail] | #wanix term status',
          )
          break
        }
        case 'bridge': {
          const [urlorstop] = readargs(words, 1, [ARG_TYPE.MAYBE_STRING])
          if (!ispresent(urlorstop) || !urlorstop.trim()) {
            apierror(
              SOFTWARE,
              player,
              'wanix',
              'usage: #wanix bridge <ws-url> | #wanix bridge stop',
            )
            break
          }
          const trimmed = urlorstop.trim()
          if (trimmed.toLowerCase() === 'stop') {
            wanixstublog(player, 'bridge stop (not wired)')
            break
          }
          wanixstublog(player, `bridge start ${trimmed} (not wired)`)
          break
        }
        case 'remote': {
          const sub = ispresent(arg) ? NAME(arg) : undefined
          if (!ispresent(sub)) {
            wanixstublog(player, 'remote menu (not wired)')
            break
          }
          if (NAME(sub) === 'connect') {
            const [url, mountdst] = readargs(words, 2, [
              ARG_TYPE.STRING,
              ARG_TYPE.MAYBE_NAME,
            ])
            if (!ispresent(url) || !url.trim()) {
              apierror(
                SOFTWARE,
                player,
                'wanix',
                'usage: #wanix remote connect <wss-url> [dst]',
              )
              break
            }
            wanixstublog(
              player,
              ispresent(mountdst)
                ? `remote connect ${url.trim()} dst=${NAME(mountdst)} (not wired)`
                : `remote connect ${url.trim()} (not wired)`,
            )
            break
          }
          apierror(
            SOFTWARE,
            player,
            'wanix',
            'usage: #wanix remote | #wanix remote connect <wss-url> [dst]',
          )
          break
        }
        default:
          apierror(
            SOFTWARE,
            player,
            'wanix',
            'drop .wasm/.tgz — #wanix menu, vm, remote, bridge, attach, term, stop, detach',
          )
          break
      }
      return 0
    },
  )
}
