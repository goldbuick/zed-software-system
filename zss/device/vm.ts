import { createdevice } from 'zss/device'
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
  memoryloader,
  memorysetdefaultplayer,
  memoryplayerscan,
  memoryplayerlogout,
  memorygetdefaultplayer,
  memoryreadflags,
  memorymessage,
  memorycleanup,
  memoryreadbookbysoftware,
  MEMORY_LABEL,
} from 'zss/memory'
import { bookreadcodepagebyaddress } from 'zss/memory/book'
import { codepageresetstats } from 'zss/memory/codepage'
import { compressbooks, decompressbooks } from 'zss/memory/compress'
import { write } from 'zss/words/writeui'

import {
  gadgetserver_clearplayer,
  platform_started,
  register_flush,
  register_refresh,
  tape_debug,
  tape_info,
  vm_codeaddress,
  vm_flush,
} from './api'
import { modemobservevaluestring, modemwriteplayer } from './modem'

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
  // gc chips
  memorycleanup()
  // export books
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    const content = await compressbooks(books)
    const historylabel = `${tag}${new Date().toISOString()} ${mainbook.name} ${content.length} chars`
    register_flush(vm.name(), historylabel, content, memorygetdefaultplayer())
  }
}

let init = false
const vm = createdevice('vm', ['init', 'tick', 'second'], (message) => {
  switch (message.target) {
    case 'init':
      if (ispresent(message.player) && !init) {
        init = true
        modemwriteplayer(message.player)
        memorysetdefaultplayer(message.player)
        // ack
        vm.reply(message, 'ackinit', true, message.player)
      }
      break
    case 'books':
      if (message.player === memorygetdefaultplayer()) {
        doasync('vm:books', async () => {
          if (isarray(message.data)) {
            const [maybebooks, maybeselect] = message.data as [string, string]
            // unpack books
            const books = await decompressbooks(maybebooks)
            const booknames = books.map((item) => item.name)
            memoryresetbooks(books, maybeselect)
            write(vm.name(), `loading ${booknames.join(', ')}`)
            // ack
            vm.reply(message, 'ackbooks', true, message.player)
          }
        })
      }
      break
    case 'login':
      if (message.player) {
        // debugger
        // attempt login
        if (memoryplayerlogin(message.player)) {
          // start tracking
          tracking[message.player] = 0
          write(vm.name(), `login from ${message.player}`)
          // ack
          vm.reply(message, 'acklogin', true, message.player)
        }
      }
      break
    case 'endgame':
      if (message.player === memorygetdefaultplayer()) {
        doasync('vm:endgame', async () => {
          if (!message.player) {
            return
          }
          // logout player
          memoryplayerlogout(message.player)
          // clear ui
          gadgetserver_clearplayer('vm', message.player)
          // save state
          await savestate()
          // reload page
          register_refresh('vm', message.player)
        })
      }
      break
    case 'doot':
      if (message.player) {
        // player keepalive
        tracking[message.player] = 0
        tape_debug(vm.name(), 'active', message.player)
      }
      break
    case 'input':
      if (message.player) {
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
      if (message.player && isarray(message.data)) {
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
          // drop inactive players (logout)
          delete tracking[player]
          memoryplayerlogout(player)
          // message outcome
          tape_info(vm.name(), 'player logout', player)
          vm.emit('logout', undefined, player)
        }
      }

      // autosave to url
      if (isjoin() === false && ++flushtick >= FLUSH_RATE) {
        flushtick = 0
        vm_flush(vm.name(), '', memorygetdefaultplayer())
      }
      break
    }
    case 'flush':
      if (message.player === memorygetdefaultplayer()) {
        doasync('vm:flush', async () => {
          if (isstring(message.data)) {
            await savestate(`${message.data} `)
          } else {
            await savestate()
          }
        })
      }
      break
    case 'cli':
      // user input from built-in console
      if (message.player === memorygetdefaultplayer()) {
        memorycli(message.player, message.data)
      }
      break
    case 'loader':
      // user input from built-in console
      if (
        message.player === memorygetdefaultplayer() &&
        isarray(message.data)
      ) {
        const [event, content] = message.data
        if (isstring(event)) {
          memoryloader(event, content, memorygetdefaultplayer())
        }
      }
      break
    default:
      // running software messages
      memorymessage(message)
      break
  }
})

export function started() {
  // signal ready state
  platform_started(vm.name(), memorygetdefaultplayer())
}
