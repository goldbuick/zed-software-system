import { createdevice } from 'zss/device'
import { parsewebfile } from 'zss/firmware/loader/parsefile'
import { INPUT, UNOBSERVE_FUNC } from 'zss/gadget/data/types'
import { doasync } from 'zss/mapping/func'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
import { isjoin } from 'zss/mapping/url'
import {
  memorycli,
  memoryplayerlogin,
  memoryreadbookbyaddress,
  memoryreadbooklist,
  memoryresetbooks,
  memorytick,
  memoryplayerscan,
  memoryplayerlogout,
  memoryreadflags,
  memorymessage,
  memoryreadbookbysoftware,
  MEMORY_LABEL,
  memoryreadsession,
  memorywriteoperator,
  memoryreadoperator,
  memoryreadplayeractive,
  memorysynthsend,
} from 'zss/memory'
import { bookreadcodepagebyaddress } from 'zss/memory/book'
import { codepageresetstats } from 'zss/memory/codepage'
import { compressbooks, decompressbooks } from 'zss/memory/compress'
import { memoryloader } from 'zss/memory/loader'
import { write } from 'zss/words/writeui'

import {
  platform_ready,
  register_loginready,
  register_savemem,
  tape_debug,
  vm_codeaddress,
  vm_flush,
  vm_logout,
} from './api'
import { modemobservevaluestring } from './modem'

// tracking active player ids
const SECOND_TIMEOUT = 16
const tracking: Record<string, number> = {}

// control how fast we persist to the register
const FLUSH_RATE = 64
let flushtick = 0

// track watched memory
const watching: Record<string, Record<string, Set<string>>> = {}
const observers: Record<string, MAYBE<UNOBSERVE_FUNC>> = {}

// save state
async function savestate(tag = ``) {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    const content = await compressbooks(books)
    const historylabel = `${tag}${new Date().toISOString()} ${mainbook.name} ${content.length} chars`
    register_savemem(vm, historylabel, content, memoryreadoperator())
  }
}

const vm = createdevice(
  'vm',
  ['tick', 'second'],
  (message) => {
    if (!vm.session(message)) {
      return
    }
    switch (message.target) {
      case 'operator':
        if (ispresent(message.player)) {
          memorywriteoperator(message.player)
          write(vm, `operator set to ${message.player}`)
          // ack
          vm.replynext(message, 'ackoperator', true, message.player)
        }
        break
      case 'books':
        if (message.player === memoryreadoperator())
          doasync(vm, async () => {
            if (message.player && isarray(message.data)) {
              const [maybebooks, maybeselect] = message.data as [string, string]
              // unpack books
              const books = await decompressbooks(maybebooks)
              const booknames = books.map((item) => item.name)
              memoryresetbooks(books, maybeselect)
              write(vm, `loading ${booknames.join(', ')}`)
              // ack
              register_loginready(vm, message.player)
            }
          })
        break
      case 'joinack':
        if (
          ispresent(message.player) &&
          !memoryreadplayeractive(message.player)
        ) {
          register_loginready(vm, message.player)
        }
        break
      case 'logout':
        if (ispresent(message.player)) {
          // logout player
          memoryplayerlogout(message.player)
          // stop tracking
          delete tracking[message.player]
          write(vm, `player ${message.player} logout`)
          // ack
          register_loginready(vm, message.player)
        }
        break
      case 'login':
        // attempt login
        if (ispresent(message.player) && memoryplayerlogin(message.player)) {
          // start tracking
          tracking[message.player] = 0
          write(vm, `login from ${message.player}`)
          // ack
          vm.replynext(message, 'acklogin', true, message.player)
        }
        break
      case 'doot':
        if (ispresent(message.player)) {
          // player keepalive
          tracking[message.player] = 0
          tape_debug(vm, 'active', message.player)
        }
        break
      case 'input':
        if (ispresent(message.player)) {
          // player input
          const flags = memoryreadflags(message.player)
          const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
          // add to input queue
          if (!isarray(flags.inputqueue)) {
            flags.inputqueue = []
          }
          if (input !== INPUT.NONE) {
            flags.inputqueue.push([input, mods])
          }
        }
        break
      case 'codewatch':
        if (ispresent(message.player) && isarray(message.data)) {
          const [book, codepage] = message.data
          // start watching
          if (!ispresent(observers[codepage])) {
            const address = vm_codeaddress(book, codepage)
            observers[codepage] = modemobservevaluestring(address, (value) => {
              // write to code
              const contentbook = memoryreadbookbyaddress(book)
              const content = bookreadcodepagebyaddress(contentbook, codepage)
              if (ispresent(content)) {
                content.code = value
                // re-parse code for @ attrs and expected data type
                codepageresetstats(content)
              }
            })
          }
          // track use
          watching[book] = watching[book] ?? {}
          watching[book][codepage] = watching[book][codepage] ?? new Set()
          watching[book][codepage].add(message.player)
        }
        break
      case 'coderelease':
        if (message.player && isarray(message.data)) {
          const [book, page] = message.data
          if (ispresent(watching[book])) {
            if (ispresent(watching[book][page])) {
              watching[book][page].delete(message.player)
              // stop watching
              if (watching[book][page].size === 0) {
                observers[page]?.()
                observers[page] = undefined
              }
            }
          }
        }
        break
      case 'tick':
        // from clock
        if (message.player !== 'locked') {
          memorytick()
        }
        break
      case 'synthsend':
        if (isstring(message.data)) {
          memorysynthsend(message.data)
        }
        break
      case 'second': {
        // ensure player ids are added to tracking
        // this manages restoring from saved or transfered state
        memoryplayerscan(tracking)

        // list of player ids
        const players = Object.keys(tracking)

        // update tracking counts
        for (let i = 0; i < players.length; ++i) {
          ++tracking[players[i]]
        }

        // drop lagged players from tracking
        for (let i = 0; i < players.length; ++i) {
          const player = players[i]
          if (tracking[player] >= SECOND_TIMEOUT) {
            vm_logout(vm, player)
          }
        }

        // autosave to url
        if (isjoin() === false && ++flushtick >= FLUSH_RATE) {
          flushtick = 0
          vm_flush(vm, 'autosave', memoryreadoperator())
        }
        break
      }
      case 'flush':
        doasync(vm, async () => {
          if (isstring(message.data)) {
            await savestate(`${message.data} `)
          } else {
            await savestate()
          }
        })
        break
      case 'cli':
        // user input from built-in console
        if (ispresent(message.player)) {
          memorycli(message.player, message.data)
        }
        break
      case 'loader':
        // user input from built-in console
        // or events from devices
        if (ispresent(message.player) && isarray(message.data)) {
          const [arg, format, filename, content] = message.data
          if (format === 'file') {
            parsewebfile(message.player, content)
          } else {
            memoryloader(arg, format, filename, content, message.player)
          }
        }
        break
      default:
        // running software messages
        memorymessage(message)
        break
    }
  },
  memoryreadsession(),
)

export function started() {
  // signal ready state
  platform_ready(vm)
}
