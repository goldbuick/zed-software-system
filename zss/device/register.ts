import { get as idbget, update as idbupdate } from 'idb-keyval'
import { createdevice, parsetarget } from 'zss/device'
import {
  write,
  writecopyit,
  writeheader,
  writeoption,
} from 'zss/feature/writeui'
import { useDeviceConfig } from 'zss/gadget/hooks'
import { doasync } from 'zss/mapping/func'
import { createpid } from 'zss/mapping/guid'
import { user } from 'zss/mapping/keyboard'
import { waitfor } from 'zss/mapping/tick'
import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { isjoin, islocked, shorturl } from 'zss/mapping/url'
import { createplatform } from 'zss/platform'
import { ismac } from 'zss/words/system'

import {
  api_error,
  gadgetserver_desync,
  network_join,
  synth_play,
  tape_crash,
  tape_debug,
  tape_info,
  tape_terminal_close,
  vm_books,
  vm_cli,
  vm_doot,
  vm_halt,
  vm_login,
  vm_operator,
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
    api_error(register, `readsession ${key}`, err.message)
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
    api_error(register, `writesession ${key} <- ${value}`, err.message)
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
    api_error(register, 'crash', err.message)
  }
  return ''
}

async function loadmem(books: string) {
  if (books.length === 0) {
    api_error(register, 'content', 'no content found')
    tape_crash(register, myplayerid)
    return
  }
  // init vm with content
  const selectedid = (await readselected()) ?? ''
  vm_books(register, books, selectedid, myplayerid)
}

let currenthash = ''
window.addEventListener('hashchange', () => {
  doasync(register, async () => {
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
      tape_debug(register, msg)
    } else {
      if (label.length) {
        document.title = label
      }
      tape_info(register, msg)
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
  ['ready', 'second', 'error'],
  function (message) {
    if (!register.session(message)) {
      return
    }
    switch (message.target) {
      case 'ready': {
        doasync(register, async () => {
          // signal init
          await waitfor(256)
          write(register, `myplayerid ${myplayerid}`)
          vm_operator(register, myplayerid)
        })
        break
      }
      case 'error:login:main':
      case 'error:login:title':
      case 'error:login:player':
        if (message.player === myplayerid) {
          tape_crash(register, myplayerid)
          vm_cli(register, '#pages', myplayerid)
        }
        break
      case 'ackoperator': {
        if (message.player === myplayerid) {
          doasync(register, async () => {
            const urlcontent = readurlhash()
            if (isjoin()) {
              network_join(register, urlcontent, myplayerid)
            } else {
              // signal halting state
              vm_halt(register, islocked(), myplayerid)
              // pull data && init
              await loadmem(urlcontent)
            }
          })
        }
        break
      }
      case 'loginready':
        if (message.player === myplayerid) {
          vm_login(register, myplayerid)
        }
        break
      case 'acklogin':
        if (message.player === myplayerid) {
          tape_terminal_close(register, myplayerid)
          gadgetserver_desync(register, myplayerid)
        }
        break
      case 'dev':
        if (message.player === myplayerid) {
          doasync(register, async function () {
            if (islocked()) {
              const url = await shorturl(location.href)
              writecopyit(register, url, url)
            } else {
              writeheader(register, `creating locked terminal`)
              await waitfor(100)
              location.href = location.href.replace(`/#`, `/locked/#`)
            }
          })
        }
        break
      case 'share':
        if (message.player === myplayerid) {
          doasync(register, async function () {
            const url = await shorturl(
              // drop /locked from shared short url if found
              location.href.replace(/cafe.*locked/, `cafe`),
            )
            writecopyit(register, url, url)
          })
        }
        break
      case 'nuke':
        if (message.player === myplayerid) {
          doasync(register, async function () {
            writeheader(register, 'nuke in')
            writeoption(register, '3', '...')
            await waitfor(1000)
            writeoption(register, '2', '...')
            await waitfor(1000)
            writeoption(register, '1', '...')
            await waitfor(1000)
            writeheader(register, 'BYE')
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
          doasync(register, async () => {
            if (isstring(message.player) && isstring(message.data)) {
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
          vm_doot(register, registerreadplayer())
        }
        break
      default:
        if (message.player === myplayerid) {
          const { target, path } = parsetarget(message.target)
          switch (target) {
            case 'touchkey':
              doasync(register, async () => {
                switch (path) {
                  case '[Alt]':
                    synth_play(register, '-c', true)
                    useDeviceConfig.setState((state) => ({
                      ...state,
                      keyboardalt: !state.keyboardalt,
                      keyboardctrl: false,
                      keyboardshift: false,
                    }))
                    break
                  case '[Ctrl]':
                    synth_play(register, '-e', true)
                    useDeviceConfig.setState((state) => ({
                      ...state,
                      keyboardalt: false,
                      keyboardctrl: !state.keyboardctrl,
                      keyboardshift: false,
                    }))
                    break
                  case '[Shift]':
                    synth_play(register, '-g', true)
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
                      synth_play(register, isnumber ? '+c' : '+f', true)
                      invoke.push('{Shift>}')
                    } else if (deviceconfig.keyboardalt) {
                      synth_play(register, isnumber ? '+c!' : '+f!', true)
                      invoke.push('{Alt>}')
                    } else if (deviceconfig.keyboardctrl) {
                      synth_play(register, isnumber ? '+c#' : '+f#', true)
                      invoke.push(`{${metakey}>}`)
                    } else {
                      synth_play(register, isnumber ? '-c' : '-f', true)
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
