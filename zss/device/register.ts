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
  peer_create,
  platform_init,
  register_ready,
  tape_crash,
  tape_info,
  tape_terminal_close,
  tape_terminal_open,
  vm_books,
  vm_doot,
  vm_login,
} from './api'
import { modemwriteplayer } from './modem'

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
    api_error(register.name(), `readsession ${key}`, err.message)
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
    api_error(register.name(), `writesession ${key} <- ${value}`, err.message)
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
    api_error('register', 'crash', err.message)
  }
  return ''
}

async function loadmem(books: string, player: string) {
  if (books.length === 0) {
    api_error(register.name(), 'content', 'no content found')
    tape_crash(register.name(), sessionid)
    return
  }
  // init vm with content
  const selectedid = (await readselectedid()) ?? ''
  vm_books(register.name(), books, selectedid, player)
}

let currenthash = ''
window.addEventListener('hashchange', () => {
  doasync('registoer:hashchange', async () => {
    const books = readurlhash()
    if (currenthash !== books) {
      currenthash = books
      await loadmem(books, sessionid)
    }
  })
})

function writeurlhash(exportedbooks: string) {
  const out = `#${exportedbooks}`
  if (location.hash !== out) {
    // saving current state, don't interrupt the user
    currenthash = out
    location.hash = out
    tape_info(
      register.name(),
      `wrote ${exportedbooks?.length ?? 0} chars [${exportedbooks.slice(0, 8)}...${exportedbooks.slice(-8)}]`,
    )
  }
}

async function readselectedid() {
  return readidb<string>('SELECTED_ID')
}

async function writeselectedid(selectedid: string) {
  return writeidb('SELECTED_ID', () => selectedid)
}

// simple bootstrap manager
let keepalive = 0

// send keepalive message every 24 seconds
const signalrate = 1

// stable unique id
const sessionid = readsession('SESSION_ID') ?? createpid()
writesession('SESSION_ID', sessionid)

export function registerreadplayer() {
  return sessionid
}

const register = createdevice(
  'register',
  ['started', 'second', 'error'],
  function (message) {
    switch (message.target) {
      case 'ready': {
        write('register', 'creating platform')
        createplatform(isjoin())
        break
      }
      case 'started': {
        doasync('register:started', async () => {
          modemwriteplayer(sessionid)
          // signal init
          await waitfor(256)
          write('register', `sessionid ${sessionid}`)
          platform_init('register', sessionid)
        })
        break
      }
      case 'error:login:main':
      case 'error:login:title':
      case 'error:login:player':
        if (message.player === sessionid) {
          tape_crash(register.name(), sessionid)
        }
        break
      case 'ackinit': {
        doasync('register:ackinit', async () => {
          if (message.player !== sessionid) {
            return
          }
          const books = readurlhash()
          if (isjoin()) {
            tape_terminal_open(register.name(), sessionid)
            peer_create(register.name(), books, message.player)
          } else {
            // pull data && init
            await loadmem(books, message.player)
          }
        })
        break
      }
      case 'ackbooks':
        if (message.player === sessionid) {
          vm_login(register.name(), message.player)
        }
        break
      case 'acklogin':
        doasync('register:acklogin', async () => {
          if (message.player === sessionid) {
            const { player } = message
            await waitfor(128)
            gadgetserver_desync(register.name(), player)
            await waitfor(512)
            tape_terminal_close(register.name(), sessionid)
          }
        })
        break
      case 'dev':
        if (message.player === sessionid) {
          doasync('register:dev', async function () {
            if (islocked()) {
              const url = await shorturl(location.href)
              writecopyit('devshare', url, url)
            } else {
              writeheader(register.name(), `creating locked terminal`)
              await waitfor(100)
              location.href = location.href.replace(`/#`, `/locked/#`)
            }
          })
        }
        break
      case 'share':
        if (message.player === sessionid) {
          doasync('register:share', async function () {
            const url = await shorturl(
              // drop /locked from shared short url if found
              location.href.replace(/cafe.*locked/, `cafe`),
            )
            writecopyit('share', url, url)
          })
        }
        break
      case 'nuke':
        if (message.player === sessionid) {
          doasync('register:nuke', async function () {
            writeheader(register.name(), 'nuke in')
            writeoption(register.name(), '3', '...')
            await waitfor(1000)
            writeoption(register.name(), '2', '...')
            await waitfor(1000)
            writeoption(register.name(), '1', '...')
            await waitfor(1000)
            writeheader(register.name(), 'BYE')
            await waitfor(100)
            // nuke is the only valid case for reload
            location.hash = ''
            currenthash = location.hash
            location.reload()
          })
        }
        break
      case 'flush':
        if (message.player === sessionid && isarray(message.data)) {
          const [maybehistorylabel, maybecontent] = message.data
          if (isstring(maybehistorylabel) && isstring(maybecontent)) {
            document.title = maybehistorylabel
            writeurlhash(maybecontent)
          }
        }
        break
      case 'select':
        if (message.player === sessionid) {
          doasync('register:select', async () => {
            if (isstring(message.player) && isstring(message.data)) {
              await writeselectedid(message.data)
              // use same solution as a hash change here ...
              await loadmem(readurlhash(), message.player)
              // re-run the vm_init flow
            }
          })
        }
        break
      case 'second':
        ++keepalive
        if (keepalive >= signalrate) {
          keepalive -= signalrate
          vm_doot(register.name(), registerreadplayer())
        }
        break
    }
  },
)

setTimeout(() => register_ready(register.name(), sessionid), 100)
