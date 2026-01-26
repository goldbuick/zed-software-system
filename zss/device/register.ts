import { createdevice } from 'zss/device'
import { fetchwiki } from 'zss/feature/fetchwiki'
import { itchiopublish } from 'zss/feature/itchiopublish'
import { withclipboard } from 'zss/feature/keyboard'
import { parsemarkdownforwriteui } from 'zss/feature/parse/markdownwriteui'
import {
  storagenukecontent,
  storagereadcontent,
  storagereadhistorybuffer,
  storagereadvars,
  storagesharecontent,
  storagewatchcontent,
  storagewritecontent,
  storagewritevar,
} from 'zss/feature/storage'
import { bbspublish, isjoin, shorturl } from 'zss/feature/url'
import { writeheader, writeoption, writetext } from 'zss/feature/writeui'
import {
  TAPE_DISPLAY,
  TAPE_MAX_LINES,
  useGadgetClient,
  useTape,
  useInspector,
  useTerminal,
} from 'zss/gadget/data/state'
import { INPUT } from 'zss/gadget/data/types'
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
  registerterminalclose,
  registerterminalfull,
  vmbooks,
  vmcli,
  vmdoot,
  vmloader,
  vmlogin,
  vmoperator,
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
  const [firstrow = ''] = terminal.logs
  const logs = [...terminal.logs]

  // flatten dupes
  const firstrowplain = tokenizeandstriptextformat(firstrow).replace(
    countregex,
    '',
  )
  const rowplain = tokenizeandstriptextformat(row)

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
      case TAPE_DISPLAY.SPLIT_X:
        // skip over these to right
        nextlayout = TAPE_DISPLAY.TOP
        break
    }
  }
  useTape.setState({ layout: nextlayout })
}

async function loadmem(books: string | BOOK[]) {
  if (books.length === 0) {
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

// stable unique id
const myplayerid = readsession('PLAYER') ?? createpid()
writesession('PLAYER', myplayerid)

// timeout for TOAST
let toasttimer: any

export function registerreadplayer() {
  return myplayerid
}

const register = createdevice(
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
          await storagewatchcontent(myplayerid)
          // setup history buffer
          const historybuffer = await storagereadhistorybuffer()
          if (ispresent(historybuffer)) {
            useTerminal.setState({
              buffer: historybuffer.filter((line) => {
                // may need to add other checks here
                return line.includes('#broadcast') === false
              }),
            })
          }
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
          vmlogin(register, myplayerid, storage)
          vmzsswords(register, myplayerid)
        })
        break
      case 'loginfail':
        doasync(register, message.player, async () => {
          await writewikilink()
          writepages()
          // full open on login fail
          registerterminalfull(register, myplayerid)
          // signal sim loaded
          vmloader(register, message.player, undefined, 'text', 'sim:load', '')
          await writehelphint()
        })
        break
      case 'acklogin':
        // hide terminal
        registerterminalclose(register, myplayerid)
        // signal sim loaded
        vmloader(register, message.player, undefined, 'text', 'sim:load', '')
        break
      case 'ackzsswords': {
        useGadgetClient.setState({ zsswords: message.data })
        const dynamicwords: string[] = []
        const words = Object.values(message.data as Record<string, string[]>)
        for (let i = 0; i < words.length; ++i) {
          dynamicwords.push(...words[i])
        }
        break
      }
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
            await storagewritevar(name, value)
          }
        })
        break
      case 'copy':
        if (isstring(message.data)) {
          if (ispresent(withclipboard())) {
            withclipboard()
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
      case 'share':
        doasync(register, message.player, async function () {
          await storagesharecontent(message.player)
        })
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
          apilog(
            register,
            message.player,
            `gadget inspector ${enabled ? '$greenon' : '$redoff'}`,
          )
          if (enabled) {
            apilog(
              register,
              message.player,
              `mouse click or tap elements to inspect`,
            )
          }
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
          const [book, path, type, title] = message.data
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
