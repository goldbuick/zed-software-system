import {
  registerbookmarkdelete,
  registerbookmarklist,
  registerscreenshot,
  vmpublish,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { formatboardfortext } from 'zss/feature/heavy/formatstate'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { bbsdelete, bbslist, bbslogin, bbslogincode } from 'zss/feature/url'
import { writeopenit, writetext } from 'zss/feature/writeui'
import { FIRMWARE } from 'zss/firmware'
import { memoryreadboardstatequery } from 'zss/memory/boardstatequery'
import { isemail } from 'zss/firmware/cli/utils'
import { doasync } from 'zss/mapping/func'
import { READ_CONTEXT, readargs, readargsuntilend } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

let bbscode = ''
let bbsemail = ''

export function registermisccommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command(
      'query',
      ['show board snapshot (objects, terrain counts, exits, kinds)'],
      () => {
        const data = memoryreadboardstatequery(READ_CONTEXT.elementfocus)
        const text = formatboardfortext(data)
        terminalwritelines(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          text,
        )
        return 0
      },
    )
    .command('bookmarks', ['list bookmarks'], () => {
      registerbookmarklist(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command(
      'bookmarkdelete',
      [ARG_TYPE.NAME, 'bookmark id'],
      (_, words) => {
        const [id] = readargs(words, 0, [ARG_TYPE.NAME])
        if (id) {
          registerbookmarkdelete(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `${id}`,
          )
        }
        return 0
      },
    )
    .command('screenshot', ['screenshot for capture'], () => {
      registerscreenshot(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command('bbs', [ARG_TYPE.ANY, 'login/publish actions'], (_, words) => {
      const [action, ii] = readargs(words, 0, [ARG_TYPE.ANY])
      switch (NAME(action)) {
        default:
          if (!bbsemail) {
            const [maybeemail, maybetag] = readargs(words, 0, [
              ARG_TYPE.NAME,
              ARG_TYPE.NAME,
            ])
            if (isemail(maybeemail) && maybetag) {
              doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
                writetext(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  `starting login with $green${maybeemail} ${maybetag}`,
                )
                const result = await bbslogin(maybeemail, maybetag)
                if (result.success) {
                  bbsemail = maybeemail
                  writetext(
                    SOFTWARE,
                    READ_CONTEXT.elementfocus,
                    `check your email for #bbs <code>`,
                  )
                }
              })
            } else {
              writetext(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                `please login with $green#bbs <email> <tag>`,
              )
            }
          } else if (!bbscode) {
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              writetext(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                `confirming login with $green${action}`,
              )
              const result = await bbslogincode(bbsemail, action)
              if (result.success) {
                bbscode = `${action}`
                writetext(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  `$green${bbsemail} has been logged in`,
                )
              }
            })
          } else {
            writetext(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `you are already logged in, use #bbs restart to login again`,
            )
          }
          break
        case 'restart':
          bbsemail = ''
          bbscode = ''
          writetext(SOFTWARE, READ_CONTEXT.elementfocus, `bbs restarted`)
          writetext(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `please login with $green#bbs <email> <tag>`,
          )
          break
        case 'list':
          if (!bbsemail || !bbscode) {
            writetext(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `please login with $green#bbs <email> <tag>$blue first`,
            )
          } else {
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              writetext(SOFTWARE, READ_CONTEXT.elementfocus, `listing files`)
              const result = await bbslist(bbsemail, bbscode)
              if (result.success) {
                for (let i = 0; i < result.list.length; ++i) {
                  const { metadata } = result.list[i]
                  writeopenit(
                    SOFTWARE,
                    READ_CONTEXT.elementfocus,
                    metadata.url,
                    metadata.filename,
                  )
                  writetext(SOFTWARE, READ_CONTEXT.elementfocus, metadata.tags)
                }
              }
            })
          }
          break
        case 'pub':
        case 'publish':
          if (!bbsemail || !bbscode) {
            writetext(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `please login with $green#bbs <email> <tag>$blue first`,
            )
          } else {
            const [filename, iii] = readargs(words, ii, [ARG_TYPE.NAME])
            const [tags] = readargsuntilend(words, iii, ARG_TYPE.NAME)
            vmpublish(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              'bbs',
              bbsemail,
              bbscode,
              filename,
              ...tags,
            )
          }
          break
        case 'del':
        case 'delete':
          if (!bbsemail || !bbscode) {
            writetext(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `please login with $green#bbs <email> <tag>$blue first`,
            )
          } else {
            const [filename] = readargs(words, ii, [ARG_TYPE.NAME])
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              writetext(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                `deleting ${filename}`,
              )
              const result = await bbsdelete(bbsemail, bbscode, filename)
              if (result.success) {
                writetext(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  `$red${filename} has been deleted`,
                )
              }
            })
          }
          break
      }
      return 0
    })
}
