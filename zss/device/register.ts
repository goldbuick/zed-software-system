import humanid from 'human-id'
import { get as idbget, update as idbupdate } from 'idb-keyval'
import { createdevice } from 'zss/device'
import { fetchwiki } from 'zss/feature/fetchwiki'
import { itchiopublish } from 'zss/feature/itchiopublish'
import { withclipboard } from 'zss/feature/keyboard'
import { parsemarkdownforwriteui } from 'zss/feature/parse/markdownwriteui'
import { bbspublish, isjoin, shorturl } from 'zss/feature/url'
import {
  writecopyit,
  writeheader,
  writeoption,
  writetext,
} from 'zss/feature/writeui'
import {
  TAPE_DISPLAY,
  useGadgetClient,
  useTape,
  useTapeEditor,
  useTapeInspector,
  useTapeTerminal,
} from 'zss/gadget/data/state'
import { INPUT } from 'zss/gadget/data/types'
import { useDeviceData, useMedia } from 'zss/gadget/hooks'
import { inputdown, inputup } from 'zss/gadget/userinput'
import { doasync } from 'zss/mapping/func'
import { createpid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import {
  MAYBE,
  isarray,
  isboolean,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { tokenizeandstriptextformat } from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import {
  MESSAGE,
  api_error,
  api_log,
  api_toast,
  bridge_join,
  gadgetserver_desync,
  register_terminal_close,
  register_terminal_full,
  vm_books,
  vm_cli,
  vm_doot,
  vm_loader,
  vm_login,
  vm_operator,
  vm_zsswords,
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

function readurlhash() {
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

async function readurlcontent(): Promise<string> {
  const urlcontent = readurlhash()
  if (urlcontent.length) {
    // see if its a shorturlhash
    const maybefullurlcontent = await readlocalurl(urlcontent)
    if (
      ispresent(maybefullurlcontent) &&
      maybefullurlcontent.length > urlcontent.length
    ) {
      return maybefullurlcontent
    }
    return urlcontent
  }
  return ''
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
  vm_cli(register, myplayerid, '#pages')
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
    logs.unshift(row)
    // need to adjust cursor row here
    if (useTapeTerminal.getState().ycursor > 0) {
      useTapeTerminal.setState((state) => {
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

async function loadmem(books: string) {
  if (books.length === 0) {
    api_error(register, myplayerid, 'content', 'no content found')
    await writewikilink()
    vm_zsswords(register, myplayerid)
    register_terminal_full(register, myplayerid)
    await writehelphint()
    return
  }
  // init vm with content
  vm_books(register, myplayerid, books)
}

let currenturlhash = ''
window.addEventListener('hashchange', () => {
  doasync(register, myplayerid, async () => {
    const urlhash = readurlhash()
    if (currenturlhash !== urlhash) {
      currenturlhash = urlhash
      const urlcontent = await readurlcontent()
      await loadmem(urlcontent)
    }
  })
})

async function writeurlcontent(
  exportedbooks: string,
  label: string,
  fullcontent: string,
) {
  if (exportedbooks.length > 2048) {
    const shorturl = await writelocalurl(exportedbooks)
    return writeurlcontent(shorturl, label, fullcontent)
  }
  const newurlhash = `#${exportedbooks}`
  if (location.hash !== newurlhash) {
    // saving current state, don't interrupt the user
    currenturlhash = exportedbooks
    location.hash = newurlhash
    const msg = `wrote ${fullcontent.length} chars [${fullcontent.slice(0, 8)}...${fullcontent.slice(-8)}]`
    if (!label.includes('autosave')) {
      api_log(register, myplayerid, msg)
    }
    document.title = label
  }
}

function readconfigdefault(name: string) {
  switch (name) {
    case 'crt':
      return 'on'
    default:
      return 'off'
  }
}

export async function readconfig(name: string) {
  const value = await readidb<string>(`config_${name}`)

  if (!value) {
    return readconfigdefault(name)
  }

  return value && value !== 'off' ? 'on' : 'off'
}

export async function readhistorybuffer() {
  return readidb<string[]>('HISTORYBUFFER')
}

export async function writehistorybuffer(historybuffer: string[]) {
  return writeidb('HISTORYBUFFER', () => historybuffer)
}

export async function writelocalurl(fullurl: string) {
  let shorturl = await readidb<string>(fullurl)
  if (shorturl === undefined) {
    // build short url
    while (shorturl === undefined) {
      const maybeurl = humanid({
        addAdverb: true,
        capitalize: false,
        adjectiveCount: 2,
      })
      const hasvalue = await readidb<string>(maybeurl)
      if (hasvalue === undefined) {
        shorturl = maybeurl
      }
    }
    // write lookups
    await writeidb(fullurl, () => shorturl)
    await writeidb(shorturl, () => fullurl)
  }
  return shorturl
}

export async function readlocalurl(shorturl: string) {
  return await readidb<string>(shorturl)
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

    switch (message.target) {
      case 'ready': {
        doasync(register, message.player, async () => {
          // setup history buffer
          const historybuffer = await readhistorybuffer()
          if (ispresent(historybuffer)) {
            useTapeTerminal.setState({
              buffer: historybuffer.filter((line) => {
                // may need to add other checks here
                return line.includes('#broadcast') === false
              }),
            })
          }
          // signal init
          await waitfor(256)
          api_log(register, myplayerid, `myplayerid ${myplayerid}`)
          vm_operator(register, myplayerid)
        })
        break
      }
      case 'ackoperator':
        // reset display
        gadgetserver_desync(register, myplayerid)
        // determine which backend to run
        doasync(register, message.player, async () => {
          const urlcontent = await readurlcontent()
          if (isjoin()) {
            bridge_join(register, myplayerid, urlcontent)
          } else {
            // pull data && init
            await loadmem(urlcontent)
          }
        })
        break
      case 'loginready':
        doasync(register, message.player, async () => {
          const storage = await readidb<Record<string, any>>('storage')
          vm_login(register, myplayerid, storage ?? {})
          vm_zsswords(register, myplayerid)
        })
        break
      case 'loginfail':
        doasync(register, message.player, async () => {
          await writewikilink()
          writepages()
          // full open on login fail
          register_terminal_full(register, myplayerid)
          // signal sim loaded
          vm_loader(register, message.player, undefined, 'text', 'sim:load', '')
          await writehelphint()
        })
        break
      case 'acklogin':
        // hide terminal
        register_terminal_close(register, myplayerid)
        // signal sim loaded
        vm_loader(register, message.player, undefined, 'text', 'sim:load', '')
        break
      case 'ackzsswords': {
        useGadgetClient.setState({
          zsswords: message.data,
        })
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
            const storage =
              (await readidb<Record<string, any>>('storage')) ?? {}
            storage[name] = value
            await writeidb('storage', () => storage)
          }
        })
        break
      case 'copy':
        if (isstring(message.data)) {
          if (ispresent(withclipboard())) {
            withclipboard()
              .writeText(message.data)
              .then(() =>
                api_toast(
                  register,
                  message.player,
                  `copied! ${message.data.slice(0, 200)}`,
                ),
              )
              .catch((err) => console.error(err))
          }
        }
        break
      case 'copyjsonfile':
        if (isarray(message.data)) {
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
              .then(() => api_toast(register, message.player, `copied! json`))
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
          // unpack short url before sharing
          const urlcontent = await readurlcontent()
          // share full content
          const out = `#${urlcontent}`
          currenturlhash = urlcontent
          location.hash = out
          // gen global shorturl
          const url = await shorturl(location.href)
          writecopyit(register, message.player, url, url)
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
          // nuke is the only valid case for reload
          location.hash = ''
          currenturlhash = location.hash
          location.reload()
        })
        break
      case 'savemem':
        doasync(register, message.player, async function () {
          if (isarray(message.data)) {
            const [maybehistorylabel, maybecontent] = message.data
            if (isstring(maybehistorylabel) && isstring(maybecontent)) {
              await writeurlcontent(
                maybecontent,
                maybehistorylabel,
                maybecontent,
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
                api_error(
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
          vm_doot(register, myplayerid)
        }
        break
      case 'inspector':
        useTape.setState((state) => {
          const enabled = ispresent(message.data)
            ? !!message.data
            : !state.inspector
          api_log(
            register,
            message.player,
            `gadget inspector ${enabled ? '$greenon' : '$redoff'}`,
          )
          if (enabled) {
            api_log(
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
          useTapeInspector.setState({
            pts: message.data,
          })
        }
        break
      case 'log':
      case 'chat':
        terminaladdlog(message)
        break
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
          const buffer = useTapeTerminal.getState().buffer
          buffer[0] = message.data
          useTapeTerminal.setState({
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
          const buffer = useTapeTerminal.getState().buffer
          buffer[0] = message.data
          useTapeTerminal.setState({
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
