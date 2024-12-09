import { createdevice } from 'zss/device'
import { INPUT, UNOBSERVE_FUNC } from 'zss/gadget/data/types'
import { doasync } from 'zss/mapping/func'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'
import {
  memorycli,
  memoryplayerlogin,
  memoryreadbookbyaddress,
  memoryreadbooklist,
  memoryresetbooks,
  memorytick,
  memoryloadfile,
  memorysetdefaultplayer,
  memoryplayerscan,
  memoryplayerlogout,
  memorygetdefaultplayer,
  memoryreadflags,
} from 'zss/memory'
import { bookreadcodepagebyaddress } from 'zss/memory/book'
import { codepageresetstats } from 'zss/memory/codepage'
import { compressbooks, decompressbooks } from 'zss/memory/compress'

import {
  register_flush,
  register_refresh,
  tape_debug,
  tape_info,
  vm_codeaddress,
  vm_flush,
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
async function savestate() {
  const books = memoryreadbooklist()
  if (books.length) {
    register_flush(vm.name(), await compressbooks(books))
  }
}

const vm = createdevice('vm', ['tick', 'second'], (message) => {
  // console.info(message)
  switch (message.target) {
    case 'init':
      if (ispresent(message.player)) {
        memorysetdefaultplayer(message.player)
        // ack
        vm.reply(message, 'ackinit', true, message.player)
      }
      break
    case 'books':
      doasync('vm:books', async () => {
        if (isarray(message.data)) {
          const [maybebooks, maybeselect] = message.data as [string, string]
          // unpack books
          const books = await decompressbooks(maybebooks)
          const booknames = books.map((item) => item.name)
          memoryresetbooks(books, maybeselect)
          // message
          tape_info(
            vm.name(),
            'reset by',
            message.sender,
            'with',
            ...booknames,
            message.player,
          )
          // ack
          vm.reply(message, 'ackbooks', true, message.player)
        }
      })
      break
    case 'login':
      if (message.player) {
        // debugger
        // attempt login
        if (memoryplayerlogin(message.player)) {
          // start tracking
          tracking[message.player] = 0
          tape_info(vm.name(), 'player login', message.player)
          // ack
          vm.reply(message, 'acklogin', true, message.player)
        }
      }
      break
    case 'endgame':
      doasync('vm:endgame', async () => {
        if (!message.player) {
          return
        }
        // logout player
        memoryplayerlogout(message.player)
        // save state
        await savestate()
        // reload page
        register_refresh('vm')
      })
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
      memorytick()
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
      if (++flushtick >= FLUSH_RATE) {
        flushtick = 0
        vm_flush(vm.name())
      }
      break
    }
    case 'flush':
      doasync('vm:flush', savestate)
      break
    case 'cli':
      // user input from built-in console
      if (ispresent(message.player)) {
        memorycli(message.player, message.data)
      }
      break
    case 'loadfile':
      // user input from built-in console
      if (ispresent(message.player)) {
        memoryloadfile(message.player, message.data)
      }
      break
    default:
      // running software messages
      memorymessage(message)
      break
  }
})

export function ready() {
  // signal ready state
  vm.emit('ready', undefined, memorygetdefaultplayer())
}
