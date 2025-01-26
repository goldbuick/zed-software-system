import { get as idbget, update as idbupdate } from 'idb-keyval'
import { createdevice } from 'zss/device'
import { doasync } from 'zss/mapping/func'
import { createpid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { isjoin, islocked, shorturl } from 'zss/mapping/url'
import { createplatform } from 'zss/platform'
import { write, writecopyit, writeheader, writeoption } from 'zss/words/writeui'

import {
  api_error,
  gadgetserver_desync,
  network_join,
  tape_crash,
  tape_debug,
  tape_info,
  tape_terminal_close,
  tape_terminal_open,
  vm_books,
  vm_doot,
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
    tape_crash(register)
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
          tape_crash(register)
        }
        break
      case 'ackoperator': {
        doasync(register, async () => {
          if (message.player !== myplayerid) {
            return
          }
          const urlcontent = readurlhash()
          if (isjoin()) {
            tape_terminal_open(register, myplayerid)
            network_join(register, urlcontent, myplayerid)
          } else {
            // pull data && init
            await loadmem(urlcontent)
          }
        })
        break
      }
      case 'ackbooks':
      case 'restart':
        doasync(register, async () => {
          await waitfor(1000)
          vm_login(register, myplayerid)
        })
        break
      case 'acklogin':
        doasync(register, async () => {
          if (message.player === myplayerid) {
            const { player } = message
            await waitfor(128)
            gadgetserver_desync(register, player)
            await waitfor(512)
            tape_terminal_close(register, myplayerid)
          }
        })
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
    }
  },
)

setTimeout(function () {
  createplatform(isjoin())
}, 100)
