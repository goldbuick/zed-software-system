import {
  apierror,
  apilog,
  wanixserverhalttask,
  wanixservermenu,
  wanixserverstoproom,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  detachwanixterm,
  readwanixactivesession,
  setattachedsession,
} from 'zss/device/wanixclient/wanixdisplay'
import {
  connectwanixremote,
  disconnectwanixremote,
  readwanixremotes,
  startwanixvm,
  stopwanixvm,
} from 'zss/device/wanixclient/wanixroom'
import { startwanixzedsync } from 'zss/device/wanixclient/wanixzedsync'
import { readwanixtermbufferkeys } from 'zss/device/wanixclient/wanixtermbuffer'
import {
  writewanixtermdump,
  writewanixtermstatus,
} from 'zss/device/wanixclient/wanixtermhandlers'
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
        wanixservermenu(SOFTWARE, player)
        return 0
      }
      switch (NAME(action)) {
        case 'vm': {
          const sub = ispresent(arg) ? NAME(arg) : undefined
          if (sub === 'stop') {
            const [stoparg] = readargs(words, 2, [ARG_TYPE.MAYBE_NAME])
            stopwanixvm(ispresent(stoparg) ? NAME(stoparg) : undefined)
            apilog(SOFTWARE, player, 'wanix vm stop')
          } else {
            startwanixvm(
              undefined,
              ispresent(arg) ? NAME(arg) : undefined,
              SOFTWARE,
              player,
            )
          }
          break
        }
        case 'stop': {
          const [stoparg] = readargs(words, 1, [ARG_TYPE.MAYBE_NAME])
          if (ispresent(stoparg) && NAME(stoparg)) {
            wanixserverhalttask(SOFTWARE, player, NAME(stoparg))
            apilog(SOFTWARE, player, `wanix task stop ${NAME(stoparg)}`)
          } else {
            wanixserverstoproom(SOFTWARE, player)
            apilog(SOFTWARE, player, 'wanix stop room')
          }
          break
        }
        case 'detach':
          detachwanixterm()
          apilog(SOFTWARE, player, 'wanix detached')
          break
        case 'attach': {
          const keys = readwanixtermbufferkeys()
          const activesession = readwanixactivesession()
          const requested =
            ispresent(arg) && NAME(arg).trim()
              ? NAME(arg).trim()
              : (activesession ?? keys[0])
          if (!requested) {
            apilog(SOFTWARE, player, 'wanix no session to attach')
            break
          }
          if (!keys.includes(requested)) {
            apilog(SOFTWARE, player, `wanix no such session ${requested}`)
            break
          }
          setattachedsession(requested)
          apilog(SOFTWARE, player, `wanix attached ${requested}`)
          break
        }
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
            writewanixtermdump(
              SOFTWARE,
              player,
              ispresent(sessionkey) ? NAME(sessionkey) : undefined,
              tail,
            )
            break
          }
          if (NAME(sub) === 'status') {
            writewanixtermstatus(SOFTWARE, player)
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
        case 'zedsync': {
          const [targetpath] = readargs(words, 1, [ARG_TYPE.MAYBE_STRING])
          if (!ispresent(targetpath) || !String(targetpath).trim()) {
            apierror(
              SOFTWARE,
              player,
              'wanix',
              'usage: #wanix zedsync <targetpath> (no spaces in path)',
            )
            break
          }
          void startwanixzedsync(SOFTWARE, player, String(targetpath).trim()).catch(
            (err) => {
              apierror(
                SOFTWARE,
                player,
                'wanix',
                err instanceof Error ? err.message : String(err),
              )
            },
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
            const remotes = readwanixremotes()
            if (remotes.length === 0) {
              apilog(SOFTWARE, player, 'wanix remotes: (none)')
              apilog(
                SOFTWARE,
                player,
                'usage: #wanix remote connect <wss-url> [dst] | #wanix remote disconnect [dst|id]',
              )
              break
            }
            for (const remote of remotes) {
              apilog(
                SOFTWARE,
                player,
                `wanix remote ${remote.dst} id=${remote.id} ${remote.url}`,
              )
            }
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
            try {
              const remote = connectwanixremote(
                url.trim(),
                ispresent(mountdst) ? NAME(mountdst) : undefined,
              )
              apilog(
                SOFTWARE,
                player,
                `wanix remote connected ${remote.url} → ${remote.dst}`,
              )
            } catch (err) {
              apierror(
                SOFTWARE,
                player,
                'wanix',
                err instanceof Error ? err.message : String(err),
              )
            }
            break
          }
          if (NAME(sub) === 'disconnect') {
            const [key] = readargs(words, 2, [ARG_TYPE.MAYBE_NAME])
            const remaining = disconnectwanixremote(
              ispresent(key) ? NAME(key) : undefined,
            )
            apilog(
              SOFTWARE,
              player,
              remaining.length === 0
                ? 'wanix remote disconnected (none left)'
                : `wanix remote disconnected (${remaining.length} left)`,
            )
            break
          }
          apierror(
            SOFTWARE,
            player,
            'wanix',
            'usage: #wanix remote | #wanix remote connect <wss-url> [dst] | #wanix remote disconnect [dst|id]',
          )
          break
        }
        default:
          apierror(
            SOFTWARE,
            player,
            'wanix',
            'drop .wasm/.tgz — #wanix menu, vm, remote, zedsync, bridge, attach, term, stop, detach',
          )
          break
      }
      return 0
    },
  )
}
