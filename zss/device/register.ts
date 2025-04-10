import { get as idbget, update as idbupdate } from 'idb-keyval'
import { createdevice, parsetarget } from 'zss/device'
import {
  write,
  writecopyit,
  writeheader,
  writeopenit,
  writeoption,
  writetext,
} from 'zss/feature/writeui'
import {
  TAPE_DISPLAY,
  TAPE_LOG_LEVEL,
  TAPE_MAX_LINES,
  TAPE_ROW,
  useGadgetClient,
  useTape,
} from 'zss/gadget/data/state'
import { useDeviceConfig } from 'zss/gadget/hooks'
import { pickwith } from 'zss/mapping/array'
import { doasync } from 'zss/mapping/func'
import { createpid, createsid } from 'zss/mapping/guid'
import { user, withclipboard } from 'zss/mapping/keyboard'
import { waitfor } from 'zss/mapping/tick'
import {
  isarray,
  isboolean,
  ispresent,
  isstring,
  MAYBE,
} from 'zss/mapping/types'
import { isjoin, islocked, shorturl } from 'zss/mapping/url'
import { createplatform } from 'zss/platform'
import { ismac } from 'zss/words/system'

import {
  api_error,
  gadgetserver_desync,
  bridge_join,
  synth_play,
  register_terminal_full,
  api_debug,
  api_info,
  register_terminal_close,
  vm_books,
  vm_cli,
  vm_doot,
  vm_halt,
  vm_login,
  vm_operator,
  vm_zsswords,
  MESSAGE,
} from './api'

// read / write from indexdb

async function readidb<T>(key: string): Promise<T | undefined> {
  return idbget(key)
}

async function writeidb<T>(
  key: string,
  updater: (oldValue: T | undefined) => T,
): Promise<void> {
  return idbupdate(key, updater)
}

// read / write from session

function readsession(key: string): MAYBE<string> {
  try {
    return sessionStorage.getItem(key) ?? undefined
  } catch (err: any) {
    api_error(register, myplayerid, `readsession ${key}`, err.message)
  }
  return undefined
}

function writesession(key: string, value: MAYBE<string>) {
  try {
    if (ispresent(value)) {
      sessionStorage.setItem(key, value)
    } else {
      sessionStorage.removeItem(key)
    }
  } catch (err: any) {
    api_error(
      register,
      myplayerid,
      `writesession ${key} <- ${value}`,
      err.message,
    )
  }
}

// read / write from window url #hash

function readurlhash(): string {
  try {
    const hash = location.hash.slice(1)
    if (hash.length) {
      return hash
    }
  } catch (err: any) {
    api_error(register, myplayerid, 'crash', err.message)
  }
  return ''
}

function writewikilink() {
  writeopenit(
    register,
    myplayerid,
    `https://github.com/goldbuick/zed-software-system/wiki`,
    `open help wiki`,
  )
}

const messagecrew: string[] = [
  '$brown$153',
  '$purple$5',
  '$green$42',
  '$ltgray$94',
  '$white$24',
  '$white$25',
  '$white$26',
  '$white$27',
  '$white$16',
  '$white$17',
  '$white$30',
  '$white$31',
  '$red$234',
  '$cyan$227',
  '$dkpurple$227',
]

function terminallog(message: MESSAGE): string {
  if (isarray(message.data)) {
    return [message.sender, ...message.data.map((v) => `${v}`)].join(' ')
  }
  return ''
}

function terminaladdmessage(message: MESSAGE) {
  const { terminal } = useTape.getState()
  const row: TAPE_ROW = [
    createsid(),
    message.target,
    pickwith(message.sender, messagecrew),
    ...message.data,
  ]

  let logs: TAPE_ROW[] = [row, ...terminal.logs]
  if (logs.length > TAPE_MAX_LINES) {
    logs = logs.slice(0, TAPE_MAX_LINES)
  }

  useTape.setState((state) => ({
    terminal: {
      ...state.terminal,
      logs,
    },
  }))
}

function terminalinclayout(inc: boolean) {
  const { layout, editor } = useTape.getState()
  const step = inc ? 1 : -1
  let nextlayout = (layout as number) + step
  if (nextlayout < 0) {
    nextlayout += TAPE_DISPLAY.MAX
  }
  if (nextlayout >= (TAPE_DISPLAY.MAX as number)) {
    nextlayout -= TAPE_DISPLAY.MAX
  }
  if (!editor.open) {
    switch (nextlayout as TAPE_DISPLAY) {
      case TAPE_DISPLAY.SPLIT_Y:
      case TAPE_DISPLAY.SPLIT_Y_ALT:
        // skip over these to right
        nextlayout = TAPE_DISPLAY.TOP
        break
    }
  }
  useTape.setState({ layout: nextlayout })
}

async function loadmem(books: string) {
  if (books.length === 0) {
    api_error(register, myplayerid, 'content', 'no content found')
    writewikilink()
    register_terminal_full(register, myplayerid)
    return
  }
  // init vm with content
  const selectedid = (await readselected()) ?? ''
  vm_books(register, myplayerid, books, selectedid)
}

let currenthash = ''
window.addEventListener('hashchange', () => {
  doasync(register, myplayerid, async () => {
    const books = readurlhash()
    if (currenthash !== books) {
      currenthash = books
      await loadmem(books)
    }
  })
})

function writeurlhash(exportedbooks: string, label: string) {
  const out = `#${exportedbooks}`
  if (location.hash !== out) {
    // saving current state, don't interrupt the user
    currenthash = exportedbooks
    location.hash = out
    const msg = `wrote ${exportedbooks?.length ?? 0} chars [${exportedbooks.slice(0, 8)}...${exportedbooks.slice(-8)}]`
    if (label.includes('autosave')) {
      api_debug(register, myplayerid, msg)
    } else {
      if (label.length) {
        document.title = label
      }
      api_info(register, myplayerid, msg)
    }
  }
}

async function readselected() {
  return readidb<string>('SELECTED')
}

async function writeselected(selected: string) {
  return writeidb('SELECTED', () => selected)
}

// simple bootstrap manager
let keepalive = 0

// send keepalive message every 24 seconds
const signalrate = 1

// stable unique id
const myplayerid = readsession('PLAYER') ?? createpid()
writesession('PLAYER', myplayerid)

export function registerreadplayer() {
  return myplayerid
}

const register = createdevice(
  'register',
  ['ready', 'second', 'info', 'error', 'debug'],
  function (message) {
    if (!register.session(message)) {
      return
    }

    const { terminal } = useTape.getState()
    switch (message.target) {
      case 'ready': {
        doasync(register, message.player, async () => {
          // signal init
          await waitfor(256)
          write(register, myplayerid, `myplayerid ${myplayerid}`)
          vm_operator(register, myplayerid)
        })
        break
      }
      case 'loginfail':
        if (message.player === myplayerid) {
          vm_cli(register, myplayerid, '#pages')
          writewikilink()
          register_terminal_full(register, myplayerid)
        }
        break
      case 'ackoperator':
        if (message.player === myplayerid) {
          doasync(register, message.player, async () => {
            const urlcontent = readurlhash()
            if (isjoin()) {
              bridge_join(register, myplayerid, urlcontent)
            } else {
              // signal halting state
              vm_halt(register, myplayerid, islocked())
              // pull data && init
              await loadmem(urlcontent)
            }
          })
        }
        break
      case 'loginready':
        if (message.player === myplayerid) {
          vm_login(register, myplayerid)
        }
        break
      case 'acklogin':
        if (message.player === myplayerid) {
          register_terminal_close(register, myplayerid)
          gadgetserver_desync(register, myplayerid)
          // get words meta
          vm_zsswords(register, myplayerid)
        }
        break
      case 'ackzsswords':
        if (message.player === myplayerid) {
          useGadgetClient.setState({
            zsswords: message.data,
          })
        }
        break
      case 'copy':
        if (isstring(message.data) && message.player === myplayerid) {
          if (ispresent(withclipboard())) {
            withclipboard()
              .writeText(message.data)
              .then(() => writetext(register, message.player, `copied!`))
              .catch((err) => console.error(err))
          }
        }
        break
      case 'copyjsonfile':
        if (isarray(message.data) && message.player === myplayerid) {
          if (ispresent(withclipboard())) {
            const [data, filename] = message.data as [any, string]
            const blob = new Blob(
              [
                JSON.stringify(
                  {
                    exported: filename,
                    data,
                  },
                  null,
                  2,
                ),
              ],
              {
                type: 'text/plain',
              },
            )
            withclipboard()
              .write([new ClipboardItem({ [blob.type]: blob })])
              .then(() => writetext(register, message.player, `copied!`))
              .catch((err) => console.error(err))
          }
        }
        break
      case 'downloadjsonfile':
        if (isarray(message.data) && message.player === myplayerid) {
          const [data, filename] = message.data as [any, string]
          try {
            const datablob = new Blob(
              [
                JSON.stringify(
                  {
                    exported: filename,
                    data,
                  },
                  null,
                  2,
                ),
              ],
              {
                type: 'application/json;charset=utf-8',
              },
            )
            const dataurl = URL.createObjectURL(datablob)
            // trigger download of file
            const anchor = document.createElement('a')
            anchor.href = dataurl
            anchor.download = filename
            // Auto click on a element, trigger the file download
            anchor.click()
            // This is required
            URL.revokeObjectURL(dataurl)
          } catch (err) {
            console.error(err)
          }
        }
        break
      case 'dev':
        if (message.player === myplayerid) {
          doasync(register, message.player, async function () {
            if (islocked()) {
              const url = await shorturl(location.href)
              writecopyit(register, message.player, url, url)
            } else {
              writeheader(register, message.player, `creating locked terminal`)
              await waitfor(100)
              location.href = location.href.replace(`/#`, `/locked/#`)
            }
          })
        }
        break
      case 'share':
        if (message.player === myplayerid) {
          doasync(register, message.player, async function () {
            const url = await shorturl(
              // drop /locked from shared short url if found
              location.href.replace(/cafe.*locked/, `cafe`),
            )
            writecopyit(register, message.player, url, url)
          })
        }
        break
      case 'nuke':
        if (message.player === myplayerid) {
          doasync(register, message.player, async function () {
            writeheader(register, message.player, 'nuke in')
            writeoption(register, message.player, '3', '...')
            await waitfor(1000)
            writeoption(register, message.player, '2', '...')
            await waitfor(1000)
            writeoption(register, message.player, '1', '...')
            await waitfor(1000)
            writeheader(register, message.player, 'BYE')
            await waitfor(100)
            // nuke is the only valid case for reload
            location.hash = ''
            currenthash = location.hash
            location.reload()
          })
        }
        break
      case 'savemem':
        if (message.player === myplayerid && isarray(message.data)) {
          const [maybehistorylabel, maybecontent] = message.data
          if (isstring(maybehistorylabel) && isstring(maybecontent)) {
            writeurlhash(maybecontent, maybehistorylabel)
          }
        }
        break
      case 'forkmem':
        if (message.player === myplayerid && isarray(message.data)) {
          const [maybecontent] = message.data
          if (isstring(maybecontent)) {
            // launch fork url
            window.open(
              location.href.replace(/#.*/, `#${maybecontent}`),
              '_blank',
            )
          }
        }
        break
      case 'select':
        if (message.player === myplayerid) {
          doasync(register, message.player, async () => {
            if (isstring(message.data)) {
              await writeselected(message.data)
              // use same solution as a hash change here ...
              await loadmem(readurlhash())
              // re-run the vm_init flow
            }
          })
        }
        break
      case 'second':
        ++keepalive
        if (keepalive >= signalrate) {
          keepalive -= signalrate
          vm_doot(register, myplayerid)
        }
        break
      case 'inspector':
        if (message.player === registerreadplayer()) {
          useTape.setState((state) => {
            const enabled = ispresent(message.data)
              ? !!message.data
              : !state.inspector
            write(
              register,
              message.player,
              `gadget inspector ${enabled ? '$greenon' : '$redoff'}`,
            )
            if (enabled) {
              write(
                register,
                message.player,
                `mouse click or tap elements to inspect`,
              )
            }
            return {
              inspector: enabled,
            }
          })
        }
        break
      case 'info':
        if (terminal.level >= TAPE_LOG_LEVEL.INFO) {
          terminaladdmessage(message)
        }
        break
      case 'debug':
        if (terminal.level >= TAPE_LOG_LEVEL.DEBUG) {
          terminaladdmessage(message)
          // eslint-disable-next-line no-console
          console.debug(terminallog(message))
        }
        break
      case 'error':
        if (terminal.level > TAPE_LOG_LEVEL.OFF) {
          terminaladdmessage(message)
        }
        console.error(terminallog(message))
        break
      case 'toast':
        doasync(register, message.player, async () => {
          if (ispresent(message.data)) {
            const hold = Math.min(
              Math.max(message.data.length * 150, 3000),
              14000,
            )
            useTape.setState({ toast: message.data })
            await waitfor(hold)
            useTape.setState({ toast: '' })
          }
        })
        break
      case 'terminal:full':
        useTape.setState((state) => ({
          layout: TAPE_DISPLAY.FULL,
          terminal: {
            ...state.terminal,
            open: true,
          },
        }))
        break
      case 'terminal:open':
        if (message.player === registerreadplayer()) {
          useTape.setState((state) => ({
            terminal: {
              ...state.terminal,
              open: true,
            },
          }))
        }
        break
      case 'terminal:quickopen':
        if (message.player === registerreadplayer()) {
          useTape.setState({
            quickterminal: true,
          })
        }
        break
      case 'terminal:close':
        if (message.player === registerreadplayer()) {
          useTape.setState((state) => ({
            quickterminal: false,
            terminal: {
              ...state.terminal,
              open: false,
            },
          }))
        }
        break
      case 'terminal:toggle':
        if (message.player === registerreadplayer()) {
          useTape.setState((state) => ({
            terminal: {
              ...state.terminal,
              open: !state.terminal.open,
            },
          }))
        }
        break
      case 'terminal:inclayout':
        if (
          message.player === registerreadplayer() &&
          isboolean(message.data)
        ) {
          terminalinclayout(message.data)
        }
        break
      case 'editor:open':
        if (isarray(message.data)) {
          const [book, path, type, title, refsheet] = message.data
          useTape.setState((state) => ({
            editor: {
              open: true,
              player: message.player,
              book,
              path,
              type,
              title,
              refsheet: refsheet.length ? refsheet : state.editor.refsheet,
            },
          }))
        }
        break
      case 'editor:close':
        useTape.setState((state) => ({
          editor: {
            ...state.editor,
            open: false,
          },
        }))
        break

      default:
        if (message.player === myplayerid) {
          const { target, path } = parsetarget(message.target)
          switch (target) {
            case 'touchkey':
              doasync(register, message.player, async () => {
                switch (path) {
                  case '[Alt]':
                    synth_play(register, message.player, '-c', true)
                    useDeviceConfig.setState((state) => ({
                      ...state,
                      keyboardalt: !state.keyboardalt,
                      keyboardctrl: false,
                      keyboardshift: false,
                    }))
                    break
                  case '[Ctrl]':
                    synth_play(register, message.player, '-e', true)
                    useDeviceConfig.setState((state) => ({
                      ...state,
                      keyboardalt: false,
                      keyboardctrl: !state.keyboardctrl,
                      keyboardshift: false,
                    }))
                    break
                  case '[Shift]':
                    synth_play(register, message.player, '-g', true)
                    useDeviceConfig.setState((state) => ({
                      ...state,
                      keyboardalt: false,
                      keyboardctrl: false,
                      keyboardshift: !state.keyboardshift,
                    }))
                    break
                  default: {
                    const isnumber = !isNaN(parseInt(path, 10))
                    const deviceconfig = useDeviceConfig.getState()
                    const invoke: string[] = []
                    const metakey = ismac ? 'Meta' : 'Ctrl'
                    if (deviceconfig.keyboardshift) {
                      synth_play(
                        register,
                        message.player,
                        isnumber ? '+c' : '+f',
                        true,
                      )
                      invoke.push('{Shift>}')
                    } else if (deviceconfig.keyboardalt) {
                      synth_play(
                        register,
                        message.player,
                        isnumber ? '+c!' : '+f!',
                        true,
                      )
                      invoke.push('{Alt>}')
                    } else if (deviceconfig.keyboardctrl) {
                      synth_play(
                        register,
                        message.player,
                        isnumber ? '+c#' : '+f#',
                        true,
                      )
                      invoke.push(`{${metakey}>}`)
                    } else {
                      synth_play(
                        register,
                        message.player,
                        isnumber ? '-c' : '-f',
                        true,
                      )
                    }
                    invoke.push(path)
                    if (deviceconfig.keyboardshift) {
                      invoke.push('{/Shift}')
                    } else if (deviceconfig.keyboardalt) {
                      invoke.push('{/Alt}')
                    } else if (deviceconfig.keyboardctrl) {
                      invoke.push(`{/${metakey}}`)
                    }
                    const keyboardinvoke = invoke.join('')
                    await user.keyboard(keyboardinvoke)
                    break
                  }
                }
              })
              break
          }
        }
        break
    }
  },
)

setTimeout(function () {
  createplatform(isjoin())
}, 100)
