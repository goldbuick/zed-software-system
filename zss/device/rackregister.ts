/**
 * Server-side rack: handles boot flow, storage, stdout output.
 * Uses storage-server for config/content. No React, no Zustand, no DOM.
 */
import { createdevice } from 'zss/device'
import {
  netterminalhost,
  readsubscribetopic,
} from 'zss/feature/netterminal-server'
import {
  storagenukecontent,
  storagereadcontent,
  storagereadhistorybuffer,
  storagereadplayer,
  storagereadvars,
  storagewatchcontent,
  storagewritecontent,
  storagewriteplayer,
  storagewritevar,
} from 'zss/feature/storage-server'
import { writeheader, writeoption } from 'zss/feature/writeui'
import { doasync } from 'zss/mapping/func'
import { createpid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import { isarray, isbook, ispresent, isstring } from 'zss/mapping/types'
import { memorylistcodepagebytypeandstat } from 'zss/memory/bookoperations'
import { BOOK, CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'
import { createstubbook } from 'zss/server/stubbook'
import { textformatToAnsi } from 'zss/server/terminal-format'

import {
  MESSAGE,
  apierror,
  apilog,
  gadgetserverdesync,
  registerterminalfull,
  vmbooks,
  vmdoot,
  vmloader,
  vmlogin,
  vmoperator,
  vmzsswords,
} from './api'

const countregex = /\((\d+)\)/

let logOutput: (line: string) => void = (line) => {
  process.stderr.write(line + '\n')
}

export function setServerLogOutput(fn: (line: string) => void) {
  logOutput = fn
}

function logToStdout(message: MESSAGE) {
  const data = message.data
  if (isarray(data)) {
    const text = data.map((v) => `${v}`).join(' ')
    const ansi = textformatToAnsi(text)
    const trimmed = ansi.replace(countregex, '').trim()
    if (trimmed.length) {
      logOutput(trimmed)
    }
  }
}

let historyBuffer: string[] = []
let myplayerid = ''
let keepalive = 0
const DOOT_RATE = 10

export function registerreadplayer() {
  return myplayerid
}

export function registerreadhistorybuffer() {
  return historyBuffer
}

export function registerwritehistorybuffer(buf: string[]) {
  historyBuffer = buf
}

export const rackregister = createdevice(
  'register',
  ['ready', 'second', 'log', 'chat', 'toast'],
  function (message) {
    if (!rackregister.session(message)) {
      return
    }

    switch (message.target) {
      case 'ready':
      case 'chat':
      case 'toast':
      case 'second':
        break
      default:
        if (message.player !== myplayerid) {
          return
        }
        break
    }

    switch (message.target) {
      case 'ready': {
        doasync(rackregister, message.player, async () => {
          myplayerid =
            (await storagereadplayer()) ??
            process.env.ZSS_PLAYER_ID ??
            createpid()
          await storagewriteplayer(myplayerid)

          await storagewatchcontent(myplayerid)

          const buffer = await storagereadhistorybuffer()
          if (ispresent(buffer)) {
            historyBuffer = buffer.filter(
              (line) => line.includes('#broadcast') === false,
            )
          }

          await waitfor(256)
          apilog(rackregister, myplayerid, `myplayerid ${myplayerid}`)
          vmoperator(rackregister, myplayerid)
        })
        break
      }
      case 'ackoperator': {
        gadgetserverdesync(rackregister, myplayerid)
        doasync(rackregister, message.player, async () => {
          const urlcontent = await storagereadcontent(myplayerid)
          await loadmem(urlcontent)
        })
        break
      }
      case 'loginready': {
        doasync(rackregister, message.player, async () => {
          const storage = await storagereadvars()
          vmlogin(rackregister, myplayerid, storage)
          vmzsswords(rackregister, myplayerid)
        })
        break
      }
      case 'acklogin': {
        if (message.data) {
          vmloader(
            rackregister,
            message.player,
            undefined,
            'text',
            'sim:load',
            '',
          )
        } else {
          doasync(rackregister, message.player, () => {
            registerterminalfull(rackregister, myplayerid)
            vmloader(
              rackregister,
              message.player,
              undefined,
              'text',
              'sim:load',
              '',
            )
            return Promise.resolve()
          })
        }
        break
      }
      case 'store': {
        doasync(rackregister, message.player, async () => {
          if (isarray(message.data)) {
            const [name, value] = message.data
            await storagewritevar(name, value)
          }
        })
        break
      }
      case 'second': {
        ++keepalive
        if (keepalive >= DOOT_RATE) {
          keepalive -= DOOT_RATE
          vmdoot(rackregister, myplayerid)
        }
        break
      }
      case 'log':
        logToStdout(message)
        break
      case 'chat':
        logToStdout(message)
        break
      case 'toast':
        if (ispresent(message.data)) {
          logOutput(`${message.data}`)
        }
        break
      case 'nuke': {
        doasync(rackregister, message.player, async () => {
          writeheader(rackregister, myplayerid, 'nuke in')
          writeoption(rackregister, myplayerid, '3', '...')
          await waitfor(1000)
          writeoption(rackregister, myplayerid, '2', '...')
          await waitfor(1000)
          writeoption(rackregister, myplayerid, '1', '...')
          await waitfor(1000)
          writeheader(rackregister, myplayerid, 'BYE')
          await waitfor(100)
          await storagenukecontent(myplayerid)
          apilog(rackregister, myplayerid, 'content deleted')
          await waitfor(200)
          process.exit(0)
        })
        break
      }
      case 'savemem': {
        doasync(rackregister, message.player, async () => {
          if (isarray(message.data)) {
            const [maybelabel, maybecontent, maybebooks] = message.data
            if (
              isstring(maybelabel) &&
              isstring(maybecontent) &&
              isarray(maybebooks) &&
              maybebooks.every(isbook)
            ) {
              await storagewritecontent(
                message.player,
                maybelabel,
                maybecontent,
                maybecontent,
                maybebooks,
              )
            }
          }
        })
        break
      }
    }
  },
)

function ensurestub(books: BOOK[]): BOOK[] {
  if (books.length === 0) {
    return [createstubbook()]
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- b.name is string, MEMORY_LABEL.MAIN is enum
  const mainBook = books.find((b) => b.name === MEMORY_LABEL.MAIN) ?? books[0]
  const hasPlayer =
    memorylistcodepagebytypeandstat(
      mainBook,
      CODE_PAGE_TYPE.OBJECT,
      MEMORY_LABEL.PLAYER,
    ).length > 0
  const hasBoard =
    memorylistcodepagebytypeandstat(
      mainBook,
      CODE_PAGE_TYPE.BOARD,
      MEMORY_LABEL.TITLE,
    ).length > 0
  if (hasPlayer && hasBoard) {
    return books
  }
  const stub = createstubbook()
  if (!hasPlayer) {
    const playerPages = memorylistcodepagebytypeandstat(
      stub,
      CODE_PAGE_TYPE.OBJECT,
      MEMORY_LABEL.PLAYER,
    )
    for (const p of playerPages) {
      mainBook.pages.push(p)
    }
  }
  if (!hasBoard) {
    const boardPages = memorylistcodepagebytypeandstat(
      stub,
      CODE_PAGE_TYPE.BOARD,
      MEMORY_LABEL.TITLE,
    )
    for (const p of boardPages) {
      mainBook.pages.push(p)
    }
  }
  return books
}

async function loadmem(content: string | BOOK[]) {
  let books: BOOK[]
  if (isarray(content)) {
    books = ensurestub(content)
  } else if (content.length === 0) {
    books = [createstubbook()]
  } else {
    apierror(
      rackregister,
      myplayerid,
      'content',
      'compressed content not supported in server mode',
    )
    vmzsswords(rackregister, myplayerid)
    registerterminalfull(rackregister, myplayerid)
    return
  }
  vmbooks(rackregister, myplayerid, books)
  await netterminalhost()
  const topic = readsubscribetopic()
  if (ispresent(topic)) {
    const joinUrl = `https://zed.cafe/join/#${topic}`
    apilog(rackregister, myplayerid, `join $white${joinUrl}`)
  }
}
