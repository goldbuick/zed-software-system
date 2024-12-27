import { get as idbget, update as idbupdate } from 'idb-keyval'
import { createdevice } from 'zss/device'
import { useGadgetClient } from 'zss/gadget/data/state'
import { doasync } from 'zss/mapping/func'
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
  register_refresh,
  tape_crash,
  tape_info,
  tape_terminal_close,
  tape_terminal_open,
  vm_books,
  vm_doot,
  vm_login,
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

let shouldreload = true
window.addEventListener('hashchange', () => {
  if (shouldreload) {
    location.reload()
  } else {
    // reset after a single pass
    shouldreload = true
  }
})

function writeurlhash(exportedbooks: string) {
  const out = `#${exportedbooks}`
  if (location.hash !== out) {
    // saving current state, don't interrupt the user
    shouldreload = false
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

const register = createdevice(
  'register',
  ['started', 'second', 'error'],
  function (message) {
    const gadgetclient = useGadgetClient.getState()
    switch (message.target) {
      case 'ready': {
        write('register', 'creating platform')
        createplatform(isjoin())
        break
      }
      case 'started': {
        if (!ispresent(message.player) || gadgetclient.gadget.player) {
          return
        }
        // get unqiue session id for window
        const name = 'SESSION_ID'
        const sessionid = readsession(name) ?? message.player
        writesession(name, sessionid)
        // init gadget & vm with player id
        write('register', `sessionid ${sessionid}`)
        // track player id
        useGadgetClient.setState((state) => {
          return {
            ...state,
            gadget: {
              ...state.gadget,
              player: sessionid,
            },
          }
        })
        // signal init
        setTimeout(() => platform_init('register', sessionid), 256)
        break
      }
      case 'error:login:main':
      case 'error:login:title':
      case 'error:login:player':
        tape_crash(register.name())
        break
      case 'ackinit': {
        doasync('register:ackinit', async () => {
          if (!ispresent(message.player)) {
            return
          }
          if (isjoin()) {
            tape_terminal_open('register')
            peer_create('register', readurlhash(), message.player)
          } else {
            // pull data
            const books = readurlhash()
            if (books.length === 0) {
              api_error(register.name(), 'content', 'no content found')
              tape_crash(register.name())
              return
            }
            // init vm with content
            const selectedid = (await readselectedid()) ?? ''
            vm_books(register.name(), books, selectedid, message.player)
          }
        })
        break
      }
      case 'ackbooks':
        if (ispresent(message.player)) {
          vm_login(register.name(), message.player)
        }
        break
      case 'acklogin':
        if (ispresent(message.player)) {
          const { player } = message
          tape_terminal_close(register.name())
          setTimeout(() => gadgetserver_desync(register.name(), player), 1000)
        }
        break
      case 'dev':
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
        break
      case 'share':
        doasync('register:share', async function () {
          const url = await shorturl(
            // drop /locked from shared short url if found
            location.href.replace(/cafe.*locked/, `cafe`),
          )
          writecopyit('share', url, url)
        })
        break
      case 'refresh':
        doasync('register:refresh', async function () {
          writeheader(register.name(), 'BYE')
          await waitfor(100)
          location.reload()
        })
        break
      case 'nuke':
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
          location.hash = ''
          location.reload()
        })
        break
      case 'flush':
        if (isarray(message.data)) {
          const [maybehistorylabel, maybecontent] = message.data
          if (isstring(maybehistorylabel) && isstring(maybecontent)) {
            document.title = maybehistorylabel
            writeurlhash(maybecontent)
          }
        }
        break
      case 'select':
        doasync('register:select', async () => {
          if (isstring(message.data)) {
            await writeselectedid(message.data)
            register_refresh(register.name())
          }
        })
        break
      case 'second':
        ++keepalive
        if (keepalive >= signalrate) {
          keepalive -= signalrate
          if (gadgetclient.gadget.player) {
            vm_doot(register.name(), gadgetclient.gadget.player)
          }
        }
        break
    }
  },
)

setTimeout(register_ready, 100)
