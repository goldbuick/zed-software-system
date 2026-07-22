import {
  apierror,
  apilog,
  wanixclientattachsession,
  wanixclientdetachsession,
  wanixserverhalttask,
  wanixservermenu,
  wanixserverstoproom,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { setuserdetached } from 'zss/device/wanixclient/state'
import {
  connectwanixremote,
  disconnectwanixremote,
  halttaskinroom,
  readwanixremotes,
  startwanixvm,
  stopwanixvm,
} from 'zss/device/wanixclient/wanixroom'
import {
  writewanixtermdump,
  writewanixtermstatus,
} from 'zss/device/wanixclient/wanixtermhandlers'
import {
  iszedsynctaskid,
  startwanixzedsync,
} from 'zss/device/wanixclient/wanixzedsync'
import { clearzedsynchalt } from 'zss/device/wanixclient/wanixzedsynchalt'
import { FIRMWARE } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME, WORD } from 'zss/words/types'

function wanixstublog(player: string, message: string) {
  apilog(SOFTWARE, player, `wanix stub: ${message}`)
}

/**
 * Lang lexer splits bare `wss://host/` into `wss` + `://host/` (label token).
 * Rejoin that pair; quoted URLs arrive as a single word.
 */
/**
 * Lang lexer splits bare `wss://host/` into `wss` + `://host/` (label token).
 * Rejoin that pair; quoted URLs arrive as a single word.
 */
function readwssremotewords(
  words: WORD[],
  start: number,
): [string | undefined, string | undefined] {
  const first = words[start]
  const second = words[start + 1]
  if (
    isstring(first) &&
    isstring(second) &&
    /^(wss?)$/i.test(first) &&
    second.startsWith('://')
  ) {
    const [mountdst] = readargs(words, start + 2, [ARG_TYPE.MAYBE_NAME])
    return [
      `${first}${second}`,
      ispresent(mountdst) ? NAME(mountdst) : undefined,
    ]
  }
  const [url, mountdst] = readargs(words, start, [
    ARG_TYPE.STRING,
    ARG_TYPE.MAYBE_NAME,
  ])
  return [
    isstring(url) ? url : undefined,
    ispresent(mountdst) ? NAME(mountdst) : undefined,
  ]
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
            // Explicit VM boot clears detach latch so session open can auto-attach.
            setuserdetached(false)
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
            const taskid = NAME(stoparg)
            if (iszedsynctaskid(taskid)) {
              // Removes room task + clears soft-halt latch when present.
              halttaskinroom(taskid)
              // Idle room / missing task: still clear latch and halt guest.
              clearzedsynchalt()
              wanixserverhalttask(SOFTWARE, player, taskid)
            } else {
              wanixserverhalttask(SOFTWARE, player, taskid)
            }
            apilog(SOFTWARE, player, `wanix task stop ${taskid}`)
          } else {
            clearzedsynchalt()
            wanixserverstoproom(SOFTWARE, player)
            apilog(SOFTWARE, player, 'wanix stop room')
          }
          break
        }
        case 'detach':
          // Main-thread store owns attach panel; do not mutate sim-local zustand.
          wanixclientdetachsession(SOFTWARE, player)
          break
        case 'attach': {
          const requested =
            ispresent(arg) && NAME(arg).trim() ? NAME(arg).trim() : ''
          wanixclientattachsession(SOFTWARE, player, requested)
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
          void startwanixzedsync(
            SOFTWARE,
            player,
            String(targetpath).trim(),
          ).catch((err) => {
            apierror(
              SOFTWARE,
              player,
              'wanix',
              err instanceof Error ? err.message : String(err),
            )
          })
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
            let url: string | undefined
            let mountdst: string | undefined
            try {
              ;[url, mountdst] = readwssremotewords(words, 2)
            } catch (err) {
              apierror(
                SOFTWARE,
                player,
                'wanix',
                err instanceof Error ? err.message : String(err),
              )
              break
            }
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
              const remote = connectwanixremote(url.trim(), mountdst)
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
