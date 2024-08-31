import { createdevice } from 'zss/device'
import { INPUT, UNOBSERVE_FUNC } from 'zss/gadget/data/types'
import { doasync } from 'zss/mapping/func'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memorycli,
  memoryplayerlogin,
  memoryreadbookbyaddress,
  memoryreadbooksbytags,
  memoryreadbooklist,
  memoryreadchip,
  memoryreadmaintags,
  memoryresetbooks,
  memorytick,
  memoryloadfile,
  memorysetdefaultplayer,
  memoryplayerscan,
  memoryplayerlogout,
  memorygetdefaultplayer,
} from 'zss/memory'
import { bookreadcodepagebyaddress } from 'zss/memory/book'
import { codepageresetstats } from 'zss/memory/codepage'
import { compressbooks, decompressbooks } from 'zss/memory/compress'
import { createos } from 'zss/os'

import {
  bip_loginfailed,
  bip_retry,
  register_flush,
  tape_crash,
  tape_debug,
  tape_info,
  vm_codeaddress,
  vm_flush,
} from './api'
import { modemobservevaluestring } from './modem'

// manages chips
const os = createos()

// remember last tick for cli invokes
let lasttick = 0

// tracking active player ids
const SECOND_TIMEOUT = 16
const tracking: Record<string, number> = {}

// control how fast we persist to the register
const FLUSH_RATE = 64
let flushtick = 0

// track watched memory
const watching: Record<string, Record<string, Set<string>>> = {}
const observers: Record<string, MAYBE<UNOBSERVE_FUNC>> = {}

const vm = createdevice('vm', ['tick', 'second'], (message) => {
  // console.info(message)
  switch (message.target) {
    case 'init':
      if (ispresent(message.player)) {
        memorysetdefaultplayer(message.player)
      }
      break
    case 'books':
      doasync(async () => {
        if (isstring(message.data)) {
          // unpack books
          const books = await decompressbooks(message.data)
          const booknames = books.map((item) => item.name)
          memoryresetbooks(books)
          // message
          tape_info(
            vm.name(),
            'reset by',
            message.sender,
            'with',
            ...booknames,
            message.player,
          )
          // guard against infinite reset
          const [mainbook] = memoryreadbooksbytags(memoryreadmaintags())
          if (ispresent(mainbook)) {
            bip_retry(vm.name(), message.player ?? '')
          }
        }
      })
      break
    case 'login':
      if (message.player) {
        if (memoryplayerlogin(message.player)) {
          tracking[message.player] = 0
          tape_info(vm.name(), 'player login', message.player)
        } else {
          const [mainbook] = memoryreadbooksbytags(memoryreadmaintags())
          if (ispresent(mainbook)) {
            tape_crash(vm.name())
          } else {
            bip_loginfailed(vm.name(), message.player)
          }
        }
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
        const memory = memoryreadchip(message.player)
        const [input = INPUT.NONE, mods = 0] = message.data ?? {}
        memory.inputqueue.add(input)
        memory.inputmods[input as INPUT] = mods
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
            const content = bookreadcodepagebyaddress(
              memoryreadbookbyaddress(book),
              codepage,
            )
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
      lasttick = message.data ?? 0
      memorytick(os, lasttick)
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
      doasync(async () => {
        const books = memoryreadbooklist()
        if (books.length) {
          register_flush(vm.name(), await compressbooks(books))
        }
      })
      break
    case 'cli':
      // user input from built-in console
      if (ispresent(message.player)) {
        memorycli(os, lasttick, message.player, message.data ?? '')
      }
      break
    case 'loadfile':
      // user input from built-in console
      if (ispresent(message.player)) {
        memoryloadfile(lasttick, message.player, message.data)
      }
      break
    default:
      // running software messages
      os.message(message)
      break
  }
})

export function ready() {
  // signal ready state
  vm.emit('ready', undefined, memorygetdefaultplayer())
}
