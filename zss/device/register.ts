import humanid from 'human-id'
import {
  get as idbget,
  getMany as idbgetmany,
  update as idbupdate,
} from 'idb-keyval'
import { createdevice } from 'zss/device'
import { itchiopublish } from 'zss/feature/itchiopublish'
import { withclipboard } from 'zss/feature/keyboard'
import { setup } from 'zss/feature/t9'
import { isjoin, islocked, shorturl } from 'zss/feature/url'
import {
  writecopyit,
  writeheader,
  writeopenit,
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
import { useDeviceData, useMedia } from 'zss/gadget/hooks'
import { doasync } from 'zss/mapping/func'
import { createpid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import {
  MAYBE,
  isarray,
  isboolean,
  isequal,
  ispresent,
  isstring,
} from 'zss/mapping/types'

import {
  MESSAGE,
  api_error,
  api_log,
  bridge_join,
  gadgetserver_desync,
  register_terminal_close,
  register_terminal_full,
  vm_books,
  vm_cli,
  vm_doot,
  vm_halt,
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

function randominteger(a: number, b: number) {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  const delta = max - min + 1
  return min + Math.floor(Math.random() * delta)
}

async function writewikilink() {
  // write stk list
  const result = await fetch(
    `https://raw.githubusercontent.com/wiki/goldbuick/zed-software-system/stklist.md?q=${randominteger(1111111, 9999999)}`,
  )
  const markdowntext = await result.text()
  const lines = markdowntext.split('\n')
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim()
    if (line.startsWith('#')) {
      writeheader(register, myplayerid, line.substring(1))
    } else if (line.includes(',')) {
      const [label, url] = line.split(',')
      writeopenit(register, myplayerid, `inline ${url.trim()}`, label.trim())
    } else {
      writetext(register, myplayerid, line)
    }
  }

  writetext(register, myplayerid, ' ')

  // write help link
  writeopenit(
    register,
    myplayerid,
    `https://github.com/goldbuick/zed-software-system/wiki`,
    `open help wiki`,
  )
}

function writepages() {
  vm_cli(register, myplayerid, '#pages')
}

function renderrow(maybelevel: string, content: string[]) {
  const level = maybelevel === 'error' ? '$red' : '$blue'
  const messagetext = content.map((v) => `${v}`).join(' ')
  const ishyperlink = messagetext.startsWith('!')
  if (ishyperlink) {
    return `!${messagetext}`
  }
  return `$onclear${level}${messagetext}`
}

const countregex = /\((\d+)\)/

function terminaladdlog(message: MESSAGE) {
  const { terminal } = useTape.getState()
  const row = renderrow(message.target, message.data)
  const [firstrow = ''] = terminal.logs
  const logs = [...terminal.logs]

  // flatten dupes
  const dupecheck = firstrow.indexOf(row)
  if (dupecheck === 0) {
    logs.shift()
    logs.unshift(`(2)${firstrow}`)
  } else if (dupecheck !== -1) {
    const countcheck = countregex.exec(firstrow)
    if (ispresent(countcheck)) {
      const newcount = parseFloat(countcheck[1]) + 1
      logs.shift()
      logs.unshift(`(${newcount})${row}`)
    } else {
      logs.unshift(row)
    }
  } else {
    logs.unshift(row)
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
    return
  }
  // init vm with content
  const selectedid = (await readconfig('selected')) ?? ''
  vm_books(register, myplayerid, books, selectedid)
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

export async function writeconfig(name: string, value: string) {
  api_log(register, myplayerid, `writing config ${name}`)
  return writeidb(`config_${name}`, () => value)
}

async function readconfigall() {
  const lookup = [
    'config_crt',
    'config_lowrez',
    'config_selected',
    'config_scanlines',
    'config_voice2text',
  ]
  const configs = await idbgetmany<string>(lookup)
  return configs.map((value, index) => {
    const key = lookup[index]
    const keyname = key.replace('config_', '')
    if (!value) {
      return [keyname, readconfigdefault(keyname)]
    }
    return [keyname, value && value !== 'off' ? 'on' : 'off']
  })
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

export function registerreadplayer() {
  return myplayerid
}

const register = createdevice(
  'register',
  ['ready', 'second', 'info', 'error', 'log', 'toast'],
  function (message) {
    if (!register.session(message)) {
      return
    }

    // player filter
    switch (message.target) {
      case 'ready':
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
      case 'refresh':
        doasync(register, message.player, async () => {
          // signal device not active
          useDeviceData.setState({ active: false })
          await waitfor(512)
          // reset state
          useTape.getState().reset()
          useMedia.getState().reset()
          useTapeEditor.getState().reset()
          useTapeTerminal.getState().reset()
          useTapeInspector.getState().reset()
          await waitfor(512)
          // signal refresh and resume active
          useDeviceData.setState((state) => ({
            active: true,
            refresh: state.refresh + 1,
          }))
        })
        break
      case 'ackoperator':
        doasync(register, message.player, async () => {
          const urlcontent = await readurlcontent()
          if (isjoin()) {
            bridge_join(register, myplayerid, urlcontent)
          } else {
            // signal halting state
            vm_halt(register, myplayerid, islocked())
            // pull data && init
            await loadmem(urlcontent)
          }
        })
        break
      case 'loginready':
        vm_login(register, myplayerid)
        vm_zsswords(register, myplayerid)
        break
      case 'loginfail':
        doasync(register, message.player, async () => {
          await writewikilink()
          writepages()
          // full open on login fail
          register_terminal_full(register, myplayerid)
        })
        break
      case 'acklogin':
        // reset display
        gadgetserver_desync(register, myplayerid)
        // hide terminal
        register_terminal_close(register, myplayerid)
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
        setup(dynamicwords)
        break
      }
      case 'copy':
        if (isstring(message.data)) {
          if (ispresent(withclipboard())) {
            withclipboard()
              .writeText(message.data)
              .then(() => writetext(register, message.player, `copied!`))
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
              .then(() => writetext(register, message.player, `copied!`))
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
      case 'dev':
        doasync(register, message.player, async function () {
          if (islocked()) {
            writeheader(register, message.player, `unlocking terminal`)
            await waitfor(100)
            location.href = location.href.replace(`/locked/#`, `/#`)
          } else {
            writeheader(register, message.player, `creating locked terminal`)
            await waitfor(100)
            location.href = location.href.replace(`/#`, `/locked/#`)
          }
        })
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
          const [maybecontent] = message.data
          if (isstring(maybecontent)) {
            // launch fork url
            window.open(
              location.href
                .replace(`/locked/#`, `/#`)
                .replace(/#.*/, `#${maybecontent}`),
              '_blank',
            )
          }
        }
        break
      case 'itchiopublishmem':
        doasync(register, message.player, async () => {
          if (isarray(message.data)) {
            const [maybename, maybecontent] = message.data
            if (isstring(maybename) && isstring(maybecontent)) {
              // save zipfile
              await itchiopublish(maybename, maybecontent)
            }
          }
        })
        break
      case 'config':
        doasync(register, message.player, async () => {
          if (isarray(message.data)) {
            const [name, value] = message.data as [string, string]
            await writeconfig(name, value)
          }
        })
        break
      case 'configshow':
        doasync(register, message.player, async () => {
          const all = await readconfigall()
          writeheader(register, message.player, 'config')
          for (let i = 0; i < all.length; ++i) {
            writeoption(register, message.player, all[i][0], all[i][1])
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
      case 'log':
        terminaladdlog(message)
        break
      case 'info':
        terminaladdlog(message)
        break
      case 'error':
        terminaladdlog(message)
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
        useTape.setState((state) => ({
          terminal: {
            ...state.terminal,
            open: true,
          },
        }))
        break
      case 'terminal:quickopen':
        if (message.data && isstring(message.data)) {
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
      case 't9words':
        doasync(register, message.player, async () => {
          await waitfor(1)
          if (isarray(message.data)) {
            const [checknumbers, wordlist] = message.data as [string, string[]]
            if (
              checknumbers != useDeviceData.getState().checknumbers ||
              isequal(wordlist, useDeviceData.getState().wordlist) === false
            ) {
              useDeviceData.setState(() => ({
                checknumbers,
                wordlist,
              }))
            }
          }
        })
        break
      case 't9wordsflag':
        doasync(register, message.player, async () => {
          await waitfor(1)
          if (isstring(message.data)) {
            if (message.data != useDeviceData.getState().wordlistflag) {
              useDeviceData.setState(() => ({
                wordlistflag: message.data,
              }))
            }
          }
        })
        break
    }
  },
)
