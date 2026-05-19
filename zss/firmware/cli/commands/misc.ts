import { registerscreenshot, vmpublish } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  formatboardfortext,
  formatlookfortext,
} from 'zss/feature/heavy/formatstate'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { znsdelete, znslist, znslogin, znslogincode } from 'zss/feature/url'
import { write, writeopenit } from 'zss/feature/writeui'
import { zsstextline, zsstexttape } from 'zss/feature/zsstextui'
import { FIRMWARE } from 'zss/firmware'
import { doasync } from 'zss/mapping/func'
import { isarray } from 'zss/mapping/types'
import { isemail } from 'zss/mapping/validate'
import { memoryreadboardstatequery } from 'zss/memory/boardstatequery'
import { memoryreadlookstatequery } from 'zss/memory/lookstatequery'
import { READ_CONTEXT, readargs, readargsuntilend } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

let znstoken = ''
let znsemail = ''

export function registermisccommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command(
      'query',
      ['show board snapshot (objects, terrain counts, exits, kinds)'],
      () => {
        const data = memoryreadboardstatequery(READ_CONTEXT.elementfocus)
        const text = formatboardfortext(data)
        terminalwritelines(SOFTWARE, READ_CONTEXT.elementfocus, text)
        return 0
      },
    )
    .command(
      'look',
      [
        'show scroll, sidebar, and board tickers (text snapshot of player UI state)',
      ],
      () => {
        const look = memoryreadlookstatequery(READ_CONTEXT.elementfocus)
        const text = formatlookfortext(look)
        terminalwritelines(SOFTWARE, READ_CONTEXT.elementfocus, text)
        return 0
      },
    )
    .command('screenshot', ['screenshot for capture'], () => {
      registerscreenshot(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command(
      'zns',
      [ARG_TYPE.ANY, 'login/publish actions'],
      (_, words) => {
        const [action, ii] = readargs(words, 0, [ARG_TYPE.ANY])
        switch (NAME(action)) {
          default:
            if (!znsemail) {
              const [maybeemail, maybenamespace] = readargs(words, 0, [
                ARG_TYPE.NAME,
                ARG_TYPE.NAME,
              ])
              if (isemail(maybeemail) && maybenamespace) {
                doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
                  write(
                    SOFTWARE,
                    READ_CONTEXT.elementfocus,
                    zsstextline(
                      `starting login with $green${maybeemail} ${maybenamespace}`,
                    ),
                  )
                  const result = await znslogin(maybeemail, maybenamespace)
                  if (result.success) {
                    znsemail = maybeemail
                    write(
                      SOFTWARE,
                      READ_CONTEXT.elementfocus,
                      zsstextline(`check your email for #zns <code>`),
                    )
                  }
                })
              } else {
                write(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  zsstextline(
                    `please login with $green#zns <email> <namespace>`,
                  ),
                )
              }
            } else if (!znstoken) {
              doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
                write(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  zsstextline(`confirming login with $green${action}`),
                )
                const result = await znslogincode(znsemail, action)
                if (result.success && result.token) {
                  znstoken = `${result.token}`
                  write(
                    SOFTWARE,
                    READ_CONTEXT.elementfocus,
                    zsstextline(`$green${znsemail} has been logged in`),
                  )
                }
              })
            } else {
              write(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                zsstextline(
                  `you are already logged in, use #zns restart to login again`,
                ),
              )
            }
            break
          case 'restart':
            znsemail = ''
            znstoken = ''
            terminalwritelines(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              zsstexttape(
                zsstextline(`zns restarted`),
                zsstextline(`please login with $green#zns <email> <namespace>`),
              ),
            )
            break
          case 'list':
            if (!znsemail || !znstoken) {
              write(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                zsstextline(
                  `please login with $green#zns <email> <namespace>$blue first`,
                ),
              )
            } else {
              doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
                write(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  zsstextline(`listing keys`),
                )
                const result = await znslist(znsemail, znstoken)
                if (result.success && isarray(result.list)) {
                  for (let i = 0; i < result.list.length; ++i) {
                    const row = result.list[i]
                    const url =
                      row.key === 'peer'
                        ? `https://zed.cafe/join/#${row.value}`
                        : `https://bytes.zed.cafe/${row.value}`
                    writeopenit(
                      SOFTWARE,
                      READ_CONTEXT.elementfocus,
                      url,
                      row.key,
                    )
                    terminalwritelines(
                      SOFTWARE,
                      READ_CONTEXT.elementfocus,
                      JSON.stringify(row),
                    )
                  }
                }
              })
            }
            break
          case 'pub':
          case 'publish':
            if (!znsemail || !znstoken) {
              write(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                zsstextline(
                  `please login with $green#zns <email> <namespace>$blue first`,
                ),
              )
            } else {
              const [filename, iii] = readargs(words, ii, [ARG_TYPE.NAME])
              const [tags] = readargsuntilend(words, iii, ARG_TYPE.NAME)
              vmpublish(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                'zns',
                znsemail,
                znstoken,
                filename,
                ...tags,
              )
            }
            break
          case 'del':
          case 'delete':
            if (!znsemail || !znstoken) {
              write(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                zsstextline(
                  `please login with $green#zns <email> <namespace>$blue first`,
                ),
              )
            } else {
              const [filename] = readargs(words, ii, [ARG_TYPE.NAME])
              doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
                write(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  zsstextline(`deleting ${filename}`),
                )
                const result = await znsdelete(znsemail, znstoken, filename)
                if (result.success) {
                  write(
                    SOFTWARE,
                    READ_CONTEXT.elementfocus,
                    zsstextline(`$red${filename} has been deleted`),
                  )
                }
              })
            }
            break
        }
        return 0
      },
      {
        byposition: [['restart', 'list', 'pub', 'publish', 'del', 'delete']],
      },
    )
}
