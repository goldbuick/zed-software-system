import { parsetarget } from 'zss/device'
import { registerscreenshot, vmpublish } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  formatboardfortext,
  formatlookfortext,
} from 'zss/feature/heavy/formatstate'
// import { readnetworkpeerid } from 'zss/feature/netterminal'
import {
  storagereadznsemail,
  storagereadznsnamespace,
  storagereadznssession,
  storagereadznstoken,
} from 'zss/feature/storage'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  znsautopublishpeer,
  znsdelete,
  znslist,
  znslogin,
  znslogincode,
  znsnormalizepathkey,
  znspersistlogin,
  znspersistlogout,
  znsurlforlistrow,
} from 'zss/feature/url'
import { write, writeopenit } from 'zss/feature/writeui'
import { zsstextline, zsstexttape } from 'zss/feature/zsstextui'
import { FIRMWARE } from 'zss/firmware'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent } from 'zss/mapping/types'
import { isemail } from 'zss/mapping/validate'
import { memoryreadboardstatequery } from 'zss/memory/boardstatequery'
import { memoryreadcodepage } from 'zss/memory/bookoperations'
import { memoryreadcodepagename } from 'zss/memory/codepageoperations'
import { memoryreadlookstatequery } from 'zss/memory/lookstatequery'
import {
  memoryreadbookbyaddress,
  memoryreadfirstbook,
} from 'zss/memory/session'
import { READ_CONTEXT, readargs, readargsuntilend } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

async function znsensureloggedin(): Promise<
  { email: string; token: string; namespace: string } | undefined
> {
  const session = await storagereadznssession()
  if (session) {
    return session
  }
  const email = await storagereadznsemail()
  const token = await storagereadznstoken()
  const namespace = await storagereadznsnamespace()
  if (email && token && namespace) {
    return { email, token, namespace }
  }
  return undefined
}

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
          default: {
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              const session = await znsensureloggedin()
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
                    write(
                      SOFTWARE,
                      READ_CONTEXT.elementfocus,
                      zsstextline(`$green${pendingemail} has been logged in`),
                    )
                    // const peerid = readnetworkpeerid()
                    // if (peerid) {
                    //   await znsautopublishpeer(
                    //     peerid,
                    //     READ_CONTEXT.elementfocus,
                    //   )
                    // }
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
          case 'list':
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              const session = await znsensureloggedin()
              if (!session) {
                write(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  zsstextline(
                    `please login with $green#zns <email> <namespace>$blue first`,
                  ),
                )
                return
              }
              write(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                zsstextline(`listing keys`),
              )
              const result = await znslist(session.email, session.token)
              if (result.success && isarray(result.list)) {
                for (let i = 0; i < result.list.length; ++i) {
                  const row = result.list[i]
                  const kind = row.metadata?.kind as string | undefined
                  const url = znsurlforlistrow(
                    session.namespace,
                    row.key,
                    row.value,
                    kind,
                  )
                  writeopenit(SOFTWARE, READ_CONTEXT.elementfocus, url, row.key)
                  terminalwritelines(
                    SOFTWARE,
                    READ_CONTEXT.elementfocus,
                    JSON.stringify(row),
                  )
                }
              }
            })
            break
          case 'pub':
          case 'publish': {
            const [mode, iii] = readargs(words, ii, [ARG_TYPE.NAME])
            const modename = NAME(mode)
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              const session = await znsensureloggedin()
              if (!session) {
                write(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  zsstextline(
                    `please login with $green#zns <email> <namespace>$blue first`,
                  ),
                )
                return
              }
              if (modename === 'bytes') {
                const [filename, iiii] = readargs(words, iii, [ARG_TYPE.NAME])
                const [tags] = readargsuntilend(words, iiii, ARG_TYPE.NAME)
                vmpublish(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  'zns',
                  session.email,
                  session.token,
                  filename,
                  ...tags,
                )
              } else if (modename === 'code') {
                const [address] = readargs(words, iii, [ARG_TYPE.NAME])
                const { target, path } = parsetarget(address)
                let book = memoryreadbookbyaddress(target)
                if (!ispresent(book)) {
                  book = memoryreadfirstbook()
                }
                const codepage = memoryreadcodepage(book, path || address)
                if (!ispresent(codepage)) {
                  write(
                    SOFTWARE,
                    READ_CONTEXT.elementfocus,
                    zsstextline(`$red codepage not found: ${address}`),
                  )
                  return
                }
                const znskey = znsnormalizepathkey(
                  memoryreadcodepagename(codepage),
                )
                if (!znskey) {
                  write(
                    SOFTWARE,
                    READ_CONTEXT.elementfocus,
                    zsstextline(`$red invalid zns key for codepage`),
                  )
                  return
                }
                vmpublish(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  'zns-text',
                  session.email,
                  session.token,
                  znskey,
                  target,
                  path,
                )
              } else {
                write(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  zsstexttape(
                    zsstextline(
                      `use $green#zns publish bytes <key>$blue or $green#zns publish code <codepage>`,
                    ),
                  ),
                )
              }
            })
            break
          }
          case 'del':
          case 'delete':
            doasync(SOFTWARE, READ_CONTEXT.elementfocus, async () => {
              const session = await znsensureloggedin()
              if (!session) {
                write(
                  SOFTWARE,
                  READ_CONTEXT.elementfocus,
                  zsstextline(
                    `please login with $green#zns <email> <namespace>$blue first`,
                  ),
                )
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
            'restart',
            'list',
            'pub',
            'publish',
            'bytes',
            'code',
            'del',
            'delete',
          ],
        ],
      },
    )
}
