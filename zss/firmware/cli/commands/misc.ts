import { registerscreenshot } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { rundeeplinks } from 'zss/feature/deeplink'
import {
  formatboardfortext,
  formatlookfortext,
} from 'zss/feature/heavy/formatstate'
import {
  storagereadznsemail,
  storagereadznsnamespace,
} from 'zss/feature/storage'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  znsdelete,
  znslogin,
  znslogincode,
  znspersistlogin,
  znspersistlogout,
} from 'zss/feature/url'
import { write } from 'zss/feature/writeui'
import { zsstextline, zsstexttape } from 'zss/feature/zsstextui'
import { FIRMWARE } from 'zss/firmware'
import {
  showznsloginguide,
  showznsmenu,
  znsreadsession,
  znsrequiresession,
  znsrunimportcode,
  znsrunpublish,
} from 'zss/firmware/cli/commands/znsmenu'
import { doasync } from 'zss/mapping/func'
import { isemail } from 'zss/mapping/validate'
import { memoryreadboardstatequery } from 'zss/memory/boardstatequery'
import { memoryreadlookstatequery } from 'zss/memory/lookstatequery'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

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
      [ARG_TYPE.ANY, 'zns menu — login, publish bytes/code, import code'],
      (_, words) => {
        // zero args case
        if (words.length === 0) {
          doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
            if (
              !(await rundeeplinks({
                player: READ_CONTEXT.elementfocus,
                surface: 'cli',
              }))
            ) {
              await showznsmenu(READ_CONTEXT.elementfocus)
            }
          })
          return 0
        }
        // ops
        const [action, ii] = readargs(words, 0, [ARG_TYPE.ANY])
        switch (NAME(action)) {
          default: {
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              if (
                await rundeeplinks({
                  player: READ_CONTEXT.elementfocus,
                  surface: 'cli',
                })
              ) {
                return
              }
              const session = await znsreadsession()
              if (!session?.token) {
                const pendingemail = await storagereadznsemail()
                if (!pendingemail) {
                  const [maybeemail, maybenamespace] = readargs(words, 0, [
                    ARG_TYPE.NAME,
                    ARG_TYPE.NAME,
                  ])
                  if (isemail(maybeemail) && maybenamespace) {
                    write(
                      SOFTWARE,
                      READ_CONTEXT.elementfocus,
                      zsstextline(
                        `starting login with $green${maybeemail} ${maybenamespace}`,
                      ),
                    )
                    const result = await znslogin(maybeemail, maybenamespace)
                    if (result.success) {
                      await znspersistlogin(maybeemail, maybenamespace)
                      write(
                        SOFTWARE,
                        READ_CONTEXT.elementfocus,
                        zsstextline(`check your email for #zns <code>`),
                      )
                    }
                  } else {
                    write(
                      SOFTWARE,
                      READ_CONTEXT.elementfocus,
                      zsstextline(
                        `please login with $green#zns <email> <namespace>`,
                      ),
                    )
                  }
                } else {
                  write(
                    SOFTWARE,
                    READ_CONTEXT.elementfocus,
                    zsstextline(`confirming login with $green${action}`),
                  )
                  const result = await znslogincode(pendingemail, action)
                  if (result.success && result.token) {
                    const namespace = (await storagereadznsnamespace()) ?? ''
                    await znspersistlogin(pendingemail, namespace, result.token)
                    await showznsmenu(READ_CONTEXT.elementfocus)
                  }
                }
              } else {
                write(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  zsstextline(
                    `you are already logged in, use #zns restart to login again`,
                  ),
                )
              }
            })
            break
          }
          case 'login':
            showznsloginguide(READ_CONTEXT.elementfocus)
            break
          case 'restart':
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              await znspersistlogout()
              terminalwritelines(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                zsstexttape(
                  zsstextline(`zns restarted`),
                  zsstextline(
                    `please login with $green#zns <email> <namespace>`,
                  ),
                ),
              )
            })
            break
          case 'book':
          case 'code':
          case 'bytes':
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              const session = await znsrequiresession(READ_CONTEXT.elementfocus)
              if (!session) {
                return
              }
              znsrunpublish(words, 0, session)
            })
            break
          case 'import':
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              const session = await znsrequiresession(READ_CONTEXT.elementfocus)
              if (!session) {
                return
              }
              await znsrunimportcode(words, ii, session)
            })
            break
          case 'del':
          case 'delete':
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              const session = await znsrequiresession(READ_CONTEXT.elementfocus)
              if (!session) {
                return
              }
              const [filename] = readargs(words, ii, [ARG_TYPE.NAME])
              write(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                zsstextline(`deleting ${filename}`),
              )
              const result = await znsdelete(
                session.email,
                session.token,
                filename,
              )
              if (result.success) {
                write(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  zsstextline(`$red${filename} has been deleted`),
                )
              }
            })
            break
        }
        return 0
      },
      {
        byposition: [
          [
            'login',
            'restart',
            'book',
            'bytes',
            'code',
            'import',
            'del',
            'delete',
          ],
        ],
      },
    )
}
