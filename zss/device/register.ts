import { createdevice } from 'zss/device'
import { modemreadtextsync } from 'zss/device/modem'
import {
  BOOKMARK_NAME_TARGET,
  BOOKMARK_SCROLL_CHIP,
  ZSS_BOOKMARKS_KEY,
  ZssTerminalBookmark,
  appendeditorbookmark,
  appendterminalbookmark,
  appendurlbookmark,
  readbookmarksfromstorage,
  readterminalbookmarkdisplaylines,
  removebookmarkbyid,
} from 'zss/feature/bookmarks'
import { isclimode } from 'zss/feature/detect'
import { fetchwiki } from 'zss/feature/fetchwiki'
import { getfingerprint } from 'zss/feature/fingerprint'
import {
  AGENTS_ROSTER_STORAGE_KEY,
  isvalidagentsroster,
} from 'zss/feature/heavy/agentsroster'
import { itchiopublish } from 'zss/feature/itchiopublish'
import { withclipboard } from 'zss/feature/keyboard'
import { parsemarkdownforwriteui } from 'zss/feature/parse/markdownwriteui'
import {
  storagenukecontent,
  storagereadconfigall,
  storagereadcontent,
  storagereadhistorybuffer,
  storagereadvars,
  storagesharecontent,
  storagewatchcontent,
  storagewriteconfig,
  storagewritecontent,
  storagewritevar,
} from 'zss/feature/storage'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { bbspublish, isjoin, shorturl } from 'zss/feature/url'
import { writeheader, writeoption, writetext } from 'zss/feature/writeui'
import { capturecurrentboardtopng } from 'zss/gadget/capture'
import {
  TAPE_DISPLAY,
  TAPE_MAX_LINES,
  useEditor,
  useGadgetClient,
  useInspector,
  useTape,
  useTerminal,
} from 'zss/gadget/data/state'
import { GADGET_ZSS_WORDS, INPUT, paneladdress } from 'zss/gadget/data/types'
import { inputdown, inputup } from 'zss/gadget/userinput'
import { doasync } from 'zss/mapping/func'
import { createpid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import {
  MAYBE,
  isarray,
  isbook,
  isboolean,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { BOOK } from 'zss/memory/types'
import { tokenizeandstriptextformat } from 'zss/words/textformat'

import {
  MESSAGE,
  apierror,
  apilog,
  apitoast,
  bridgejoin,
  gadgetserverdesync,
  heavyrestoreagents,
  registerterminalclose,
  registerterminalfull,
  vmbookmarkscroll,
  vmbooks,
  vmclearscroll,
  vmcli,
  vmdoot,
  vmeditorbookmarkscroll,
  vmloader,
  vmlogin,
  vmoperator,
  vmplayertoken,
  vmzsswords,
} from './api'

// read / write from session

function readsession(key: string): MAYBE<string> {
  try {
    return sessionStorage.getItem(key) ?? undefined
  } catch (err: any) {
    apierror(register, myplayerid, `readsession ${key}`, err.message)
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
    apierror(
      register,
      myplayerid,
      `writesession ${key} <- ${value}`,
      err.message,
    )
  }
}

async function writewikilink() {
  const markdowntext = await fetchwiki('cli')
  parsemarkdownforwriteui(myplayerid, markdowntext)
}

async function writehelphint() {
  await waitfor(1000)
  writetext(
    register,
    myplayerid,
    `try typing $green#help$blue and pressing enter!`,
  )
}

function writepages() {
  vmcli(register, myplayerid, '#pages')
}

function renderrow(content: string[]) {
  if (!content || !Array.isArray(content)) {
    return ''
  }
  const messagetext = content.map((v) => `${v}`).join(' ')
  const ishyperlink = messagetext.startsWith('!')
  if (ishyperlink) {
    return `!${messagetext}`
  }
  return `$onclear$blue${messagetext}`
}

const countregex = /\((\d+)\)/

function terminaladdlog(message: MESSAGE) {
  const { terminal } = useTape.getState()
  const row = renderrow(message.data)
  const rowplain = tokenizeandstriptextformat(row)
    .replace(countregex, '')
    .trim()
  if (!rowplain.length) {
    return
  }
  const [firstrow = ''] = terminal.logs
  const logs = [...terminal.logs]

  // flatten dupes
  const firstrowplain = tokenizeandstriptextformat(firstrow).replace(
    countregex,
    '',
  )

  const dupecheck = firstrowplain.indexOf(rowplain)
  if (rowplain.length && firstrowplain.length && dupecheck === 0) {
    const countcheck = countregex.exec(firstrow)
    if (ispresent(countcheck)) {
      const newcount = parseFloat(countcheck[1]) + 1
      logs.shift()
      logs.unshift(`(${newcount})${row}`)
    } else {
      logs.shift()
      logs.unshift(`(2)${row}`)
    }
  } else {
    while (logs.length >= TAPE_MAX_LINES) {
      logs.pop()
    }
    logs.unshift(row)
    // need to adjust cursor row here
    if (useTerminal.getState().ycursor > 0) {
      useTerminal.setState((state) => {
        return {
          ycursor: state.ycursor + 1,
          yselect: state.yselect ? state.yselect + 1 : undefined,
        }
      })
    }
  }

  useTape.setState((state) => ({
    terminal: {
      ...state.terminal,
      logs,
    },
  }))
  // headless server mode: forward log to Node for Ink REPL (with format for fg/bg colors)
  const nodelog = (window as { __nodeLog?: (line: string) => void }).__nodeLog
  if (typeof nodelog === 'function' && isstring(row)) {
    nodelog(row)
  }
}

function terminalinclayout(inc: boolean) {
  const { layout } = useTape.getState()
  const step = inc ? 1 : -1
  let nextlayout = (layout as number) + step
  if (nextlayout < 0) {
    nextlayout += TAPE_DISPLAY.MAX
  }
  if (nextlayout >= (TAPE_DISPLAY.MAX as number)) {
    nextlayout -= TAPE_DISPLAY.MAX
  }
  useTape.setState({ layout: nextlayout })
}

async function loadmem(books: string | BOOK[]) {
  if (!books || books.length === 0) {
    apierror(register, myplayerid, 'content', 'no content found')
    await writewikilink()
    vmzsswords(register, myplayerid)
    registerterminalfull(register, myplayerid)
    await writehelphint()
    return
  }
  // init vm with content
  vmbooks(register, myplayerid, books)
}

// simple bootstrap manager
let keepalive = 0

// send keepalive message every 10 seconds
const DOOT_RATE = 10

// stable unique id (CLI mode injects via registerSetPlayerId)
let myplayerid = readsession('PLAYER') ?? createpid()
writesession('PLAYER', myplayerid)

async function syncterminalbookmarkpins() {
  const blob = await readbookmarksfromstorage()
  const pinlines = readterminalbookmarkdisplaylines(blob)
  const pinids = blob.terminal.map((b: ZssTerminalBookmark) => b.id)
  useTape.setState((state) => ({
    terminal: {
      ...state.terminal,
      pinlines,
      pinids,
    },
  }))
}

export function registersetmyplayerid(id: string) {
  myplayerid = id
}

// timeout for TOAST
let toasttimer: any

export function registerreadplayer() {
  return myplayerid
}

export const register = createdevice(
  'register',
  ['ready', 'second', 'log', 'chat', 'toast'],
  function (message) {
    if (!register.session(message)) {
      return
    }

    // player filter
    switch (message.target) {
      case 'ready':
      case 'chat':
      case 'toast':
      case 'second':
        // console.info(message)
        break
      default:
        if (message.player !== myplayerid) {
          return
        }
        break
    }

    // use gadget state to current board
    const currentboard = useGadgetClient.getState().gadget.board
    switch (message.target) {
      case 'ready': {
        doasync(register, message.player, async () => {
          // setup content watcher
          storagewatchcontent(myplayerid)
          // setup history buffer
          const historybuffer = await storagereadhistorybuffer()
          if (ispresent(historybuffer)) {
            useTerminal.setState({
              buffer: historybuffer.filter((line: string) => {
                // may need to add other checks here
                return line.includes('#broadcast') === false
              }),
            })
          }
          await syncterminalbookmarkpins()
          // signal init
          await waitfor(256)
          apilog(register, myplayerid, `myplayerid ${myplayerid}`)
          vmoperator(register, myplayerid)
        })
        break
      }
      case 'ackoperator':
        // reset display
        gadgetserverdesync(register, myplayerid)
        // determine which backend to run
        doasync(register, message.player, async () => {
          const urlcontent = await storagereadcontent(myplayerid)
          if (isjoin() && isstring(urlcontent)) {
            bridgejoin(register, myplayerid, urlcontent)
          } else {
            // pull data && init
            await loadmem(urlcontent)
          }
        })
        break
      case 'loginready':
        doasync(register, message.player, async () => {
          const storage = await storagereadvars()
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [ZSS_BOOKMARKS_KEY]: _bookmarks, ...storageforlogin } =
            storage
          const config = await storagereadconfigall()
          const token = await getfingerprint()
          vmlogin(register, myplayerid, {
            ...storageforlogin,
            config,
            token,
          })
          vmzsswords(register, myplayerid)
        })
        break
      case 'acklogin':
        if (message.data) {
          // hide terminal
          registerterminalclose(register, myplayerid)
          // signal sim loaded
          vmloader(register, message.player, undefined, 'text', 'sim:load', '')
          // CLI mode: start multiplayer after confirmed login (player is on board)
          if (isclimode()) {
            vmcli(register, myplayerid, '#joincode')
          }
          doasync(register, message.player, async () => {
            const vars = await storagereadvars()
            const raw = vars[AGENTS_ROSTER_STORAGE_KEY]
            if (isvalidagentsroster(raw)) {
              heavyrestoreagents(register, myplayerid, raw)
            }
          })
        } else {
          doasync(register, message.player, async () => {
            await writewikilink()
            writepages()
            // full open on login fail
            registerterminalfull(register, myplayerid)
            // signal sim loaded
            vmloader(
              register,
              message.player,
              undefined,
              'text',
              'sim:load',
              '',
            )
            await writehelphint()
          })
        }
        break
      case 'ackzsswords': {
        if (ispresent(message.data)) {
          useGadgetClient.setState({
            zsswords: message.data as GADGET_ZSS_WORDS,
          })
        }
        break
      }
      case 'ackcodepagesnapshot': {
        doasync(register, message.player, async () => {
          const d = message.data as Record<string, unknown> | null | undefined
          if (!d || typeof d !== 'object') {
            return
          }
          const book = d.book
          const path = d.path
          const type = d.type
          const title = d.title
          const codepage = d.codepage
          if (
            !isstring(book) ||
            !isarray(path) ||
            !isstring(type) ||
            !isstring(title)
          ) {
            apitoast(register, myplayerid, 'bookmark snapshot failed')
            return
          }
          const pathstrs = path.filter(isstring)
          await appendeditorbookmark({
            book,
            path: pathstrs,
            type,
            title,
            codepage,
          })
          apitoast(register, myplayerid, `bookmarked editor $green${title}`)
        })
        break
      }
      case 'bookmarkscroll':
        doasync(register, message.player, async () => {
          const blob = await readbookmarksfromstorage()
          vmbookmarkscroll(register, myplayerid, blob.url)
        })
        break
      case 'editorbookmarkscroll':
        doasync(register, message.player, async () => {
          const blob = await readbookmarksfromstorage()
          vmeditorbookmarkscroll(register, myplayerid, blob.editor)
        })
        break
      case 'bookmark:urlsave':
        doasync(register, message.player, async () => {
          const addr = paneladdress(BOOKMARK_SCROLL_CHIP, BOOKMARK_NAME_TARGET)
          const rawname = modemreadtextsync(addr).trim()
          if (!rawname.length) {
            apitoast(register, myplayerid, 'enter a bookmark name first')
            return
          }
          await appendurlbookmark(rawname, location.href)
          vmclearscroll(register, myplayerid)
          apitoast(register, myplayerid, `saved bookmark $green${rawname}`)
        })
        break
      case 'bookmark:delete':
        doasync(register, message.player, async () => {
          const id = message.data
          if (!isstring(id)) {
            return
          }
          const ok = await removebookmarkbyid(id)
          if (ok) {
            apitoast(register, myplayerid, 'bookmark removed')
            await syncterminalbookmarkpins()
          }
        })
        break
      case 'bookmark:list':
        doasync(register, message.player, async () => {
          const blob = await readbookmarksfromstorage()
          writeheader(register, myplayerid, 'bookmarks')
          let n = 1
          for (let i = 0; i < blob.url.length; ++i) {
            const b = blob.url[i]
            writeoption(
              register,
              myplayerid,
              `${n}`,
              `url $cyan${b.name}$white ${b.id}`,
            )
            ++n
          }
          for (let i = 0; i < blob.terminal.length; ++i) {
            const b = blob.terminal[i]
            writeoption(
              register,
              myplayerid,
              `${n}`,
              `terminal $cyan${b.text.slice(0, 48)}$white ${b.id}`,
            )
            ++n
          }
          for (let i = 0; i < blob.editor.length; ++i) {
            const b = blob.editor[i]
            writeoption(
              register,
              myplayerid,
              `${n}`,
              `editor $cyan${b.title}$white ${b.id}`,
            )
            ++n
          }
          writetext(
            register,
            myplayerid,
            `$ltgrey#bookmarkdelete <id>$white to remove`,
          )
        })
        break
      case 'bookmark:appendterminal':
        doasync(register, message.player, async () => {
          const line = message.data
          if (!isstring(line) || !line.trim()) {
            apitoast(register, myplayerid, 'nothing to bookmark')
            return
          }
          await appendterminalbookmark(line)
          await syncterminalbookmarkpins()
          apitoast(register, myplayerid, 'terminal line bookmarked')
        })
        break
      case 'runbookmark':
        doasync(register, message.player, async () => {
          let pinid: MAYBE<string>
          if (isarray(message.data)) {
            const arr = message.data as unknown[]
            const last = arr[arr.length - 1]
            if (isstring(last)) {
              pinid = last
            }
          } else if (isstring(message.data)) {
            pinid = message.data
          }
          if (!pinid) {
            return
          }
          const blob = await readbookmarksfromstorage()
          const entry = blob.terminal.find(
            (b: ZssTerminalBookmark) => b.id === pinid,
          )
          if (!entry) {
            apitoast(register, myplayerid, 'pin not found')
            return
          }
          const line = entry.text.trim()
          if (!line.length) {
            return
          }
          const preview = line.length > 48 ? `${line.slice(0, 48)}…` : line
          apitoast(register, myplayerid, `bookmark run $cyan${preview}$white`)
          vmcli(register, message.player, line)
        })
        break
      case 'input':
        if (isarray(message.data)) {
          const [input, shift] = message.data as [INPUT, boolean]
          if (shift) {
            inputdown(0, INPUT.SHIFT)
            inputdown(0, input)
            inputup(0, input)
            inputup(0, INPUT.SHIFT)
          } else {
            inputdown(0, input)
            inputup(0, input)
          }
        }
        break
      case 'store':
        doasync(register, message.player, async () => {
          if (isarray(message.data)) {
            const [name, value] = message.data
            if (typeof name === 'string' && name.startsWith('config_')) {
              await storagewriteconfig(name.slice(7), value)
            } else {
              await storagewritevar(name, value)
            }
          }
        })
        break
      case 'token':
        if (isstring(message.data)) {
          vmplayertoken(register, message.player, message.data)
        }
        break
      case 'copy':
        if (isstring(message.data)) {
          const clipboard = withclipboard()
          if (ispresent(clipboard)) {
            clipboard
              .writeText(message.data)
              .then(() =>
                apitoast(
                  register,
                  message.player,
                  `copied! ${message.data.slice(0, 200)}`,
                ),
              )
              .catch((err) => console.error(err))
          }
        }
        break
      case 'downloadjsonfile':
        if (isarray(message.data)) {
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
      case 'downloadbinaryfile':
        if (isarray(message.data)) {
          const [bytes, filename, mimetype] = message.data as [
            Uint8Array,
            string,
            string,
          ]
          try {
            const copy = new Uint8Array(bytes)
            const datablob = new Blob([copy], {
              type: isstring(mimetype) ? mimetype : 'application/octet-stream',
            })
            const dataurl = URL.createObjectURL(datablob)
            const anchor = document.createElement('a')
            anchor.href = dataurl
            anchor.download = filename
            anchor.click()
            URL.revokeObjectURL(dataurl)
          } catch (err) {
            console.error(err)
          }
        }
        break
      case 'share':
        doasync(register, message.player, async function () {
          await storagesharecontent(message.player)
        })
        break
      case 'screenshot':
        capturecurrentboardtopng()
        break
      case 'nuke':
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
          storagenukecontent(message.player)
        })
        break
      case 'savemem':
        doasync(register, message.player, async function () {
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
      case 'forkmem':
        if (isarray(message.data)) {
          const [maybecontent, maybeaddress] = message.data
          if (isstring(maybecontent) && isstring(maybeaddress)) {
            const url = maybeaddress
              ? `https://${maybeaddress}/#${maybecontent}`
              : location.href.replace(/#.*/, `#${maybecontent}`)
            // launch fork url
            window.open(url, '_blank')
          }
        }
        break
      case 'publishmem':
        doasync(register, message.player, async () => {
          if (isarray(message.data)) {
            const [content, method] = message.data
            switch (method) {
              case 'itchio': {
                // publish info
                const [, , name] = message.data
                if (isstring(content) && isstring(name)) {
                  writetext(register, message.player, `publishing ${name}`)
                  // save zipfile
                  await itchiopublish(name, content)
                  writetext(
                    register,
                    message.player,
                    `$green${name} has been exported for upload to itch.io`,
                  )
                }
                break
              }
              case 'bbs': {
                // publish info
                const [, , bbsemail, bbscode, filename, ...tags] = message.data
                if (
                  isstring(content) &&
                  isstring(bbsemail) &&
                  isstring(bbscode) &&
                  isstring(filename)
                ) {
                  writetext(register, message.player, `publishing ${filename}`)
                  const url = await shorturl(`${location.origin}/#${content}`)
                  const result = await bbspublish(
                    bbsemail,
                    bbscode,
                    filename,
                    url,
                    tags,
                  )
                  if (result.success) {
                    writetext(
                      register,
                      message.player,
                      `$green${filename} has been published to bbs`,
                    )
                  }
                }
                break
              }
              default:
                apierror(
                  register,
                  message.player,
                  'publish',
                  `unknown publish method ${method}`,
                )
                break
            }
          }
        })
        break
      case 'second':
        ++keepalive
        if (keepalive >= DOOT_RATE) {
          keepalive -= DOOT_RATE
          vmdoot(register, myplayerid)
        }
        break
      case 'inspector':
        useTape.setState((state) => {
          const enabled = ispresent(message.data)
            ? !!message.data
            : !state.inspector
          const line1 = `gadget inspector ${enabled ? '$greenon' : '$redoff'}`
          terminalwritelines(
            register,
            message.player,
            enabled
              ? `${line1}\nmouse click or tap elements to inspect`
              : line1,
          )
          return {
            inspector: enabled,
          }
        })
        break
      case 'findany':
        if (isarray(message.data)) {
          useInspector.setState({ pts: message.data })
        }
        break
      case 'log':
        terminaladdlog(message)
        break
      case 'chat': {
        if (message.player === '' || message.player === currentboard) {
          terminaladdlog(message)
        }
        break
      }
      case 'toast':
        if (ispresent(message.data)) {
          clearTimeout(toasttimer)
          useTape.setState({ toast: message.data })
          const holdratio = Math.max(message.data.length * 150, 3000)
          const hold = Math.min(holdratio, 14000)
          toasttimer = setTimeout(() => useTape.setState({ toast: '' }), hold)
        }
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
        if (isstring(message.data)) {
          // write state
          const buffer = useTerminal.getState().buffer
          buffer[0] = message.data
          useTerminal.setState({
            buffer,
            bufferindex: 0,
            xcursor: message.data.length,
            ycursor: 0,
            xselect: undefined,
            yselect: undefined,
          })
        }
        useTape.setState((state) => ({
          terminal: {
            ...state.terminal,
            open: true,
          },
        }))
        break
      case 'terminal:quickopen':
        if (isstring(message.data)) {
          // write state
          const buffer = useTerminal.getState().buffer
          buffer[0] = message.data
          useTerminal.setState({
            buffer,
            bufferindex: 0,
            xcursor: message.data.length,
            ycursor: 0,
            xselect: undefined,
            yselect: undefined,
          })
        }
        useTape.setState({ quickterminal: true, layout: TAPE_DISPLAY.TOP })
        break
      case 'terminal:close':
        useTape.setState((state) => ({
          quickterminal: false,
          terminal: {
            ...state.terminal,
            open: false,
          },
        }))
        break
      case 'terminal:toggle':
        useTape.setState((state) => ({
          terminal: {
            ...state.terminal,
            open: !state.terminal.open,
          },
        }))
        break
      case 'terminal:inclayout':
        if (isboolean(message.data)) {
          terminalinclayout(message.data)
        }
        break
      case 'editor:open':
        if (isarray(message.data)) {
          const [book, path, type, title, startline] = message.data
          useEditor.setState({ startline })
          useTape.setState(() => ({
            editor: {
              open: true,
              player: message.player,
              book,
              path,
              type,
              title,
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
    }
  },
)
