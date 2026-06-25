import {
  apierror,
  wanixattach,
  wanixbindscroll,
  wanixdetach,
  wanixshow,
  wanixstop,
  wanixvmstart,
  wanixvmstop,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  defaultwanixbindpathforscroll,
  readscrollcodepagebody,
} from 'zss/feature/scroll/stripscrollheader'
import { FIRMWARE } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

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
        case 'stop':
          wanixstop(SOFTWARE, player, ispresent(arg) ? NAME(arg) : undefined)
          break
        case 'detach':
          wanixdetach(SOFTWARE, player)
          break
        case 'attach':
          wanixattach(SOFTWARE, player, ispresent(arg) ? NAME(arg) : undefined)
          break
        case 'bind': {
          const scrollname = ispresent(arg) ? NAME(arg) : undefined
          if (!scrollname) {
            apierror(
              SOFTWARE,
              player,
              'wanix',
              'usage: #wanix bind <scrollname> [path]',
            )
            break
          }
          const [patharg] = readargs(words, 2, [ARG_TYPE.MAYBE_NAME])
          const codepage = memorypickcodepagewithtypeandstat(
            CODE_PAGE_TYPE.SCROLL,
            scrollname,
          )
          if (!codepage) {
            apierror(
              SOFTWARE,
              player,
              'wanix',
              `unknown @scroll codepage: ${scrollname}`,
            )
            break
          }
          const body = readscrollcodepagebody(codepage)
          if (body === undefined) {
            apierror(
              SOFTWARE,
              player,
              'wanix',
              `not a scroll codepage: ${scrollname}`,
            )
            break
          }
          const path = ispresent(patharg)
            ? NAME(patharg)
            : defaultwanixbindpathforscroll(scrollname)
          wanixbindscroll(SOFTWARE, player, {
            scrollname,
            path,
            text: body,
          })
          break
        }
        default:
          apierror(
            SOFTWARE,
            player,
            'wanix',
            'drop .wasm/.tgz — #wanix menu, bind, vm, attach, stop, detach',
          )
          break
      }
      return 0
    },
  )
}
