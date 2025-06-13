import { objectKeys } from 'ts-extras'
import { createdevice, parsetarget } from 'zss/device'
import { parsewebfile } from 'zss/feature/parsefile'
import { DIVIDER } from 'zss/feature/writeui'
import { DRIVER_TYPE, firmwarelistcommands } from 'zss/firmware/runner'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { INPUT, UNOBSERVE_FUNC } from 'zss/gadget/data/types'
import { doasync } from 'zss/mapping/func'
import { totarget } from 'zss/mapping/string'
import {
  MAYBE,
  isarray,
  isboolean,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
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
  memorysendtoactiveboards,
  memorywritehalt,
  memoryreadhalt,
  memoryresetchipafteredit,
  memoryrestartallchipsandflags,
  memorysetbook,
  memoryclirepeatlast,
  memoryhasflags,
  memoryclirepeatslot,
} from 'zss/memory'
import { boardobjectread } from 'zss/memory/board'
import {
  bookreadcodepagebyaddress,
  bookreadcodepagesbytype,
  bookwritecodepage,
} from 'zss/memory/book'
import {
  codepageapplyelementstats,
  codepagereaddata,
  codepagereadname,
  codepagereadstatsfromtext,
  codepagereadtype,
  codepagereadtypetostring,
  codepageresetstats,
} from 'zss/memory/codepage'
import { compressbooks, decompressbooks } from 'zss/memory/compress'
import { memoryinspect, memoryinspectcommand } from 'zss/memory/inspect'
import { memoryinspectbatchcommand } from 'zss/memory/inspectbatch'
import { memoryloader } from 'zss/memory/loader'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { categoryconsts } from 'zss/words/category'
import { collisionconsts } from 'zss/words/collision'
import { colorconsts } from 'zss/words/color'
import { dirconsts } from 'zss/words/dir'
import { NAME, PT } from 'zss/words/types'

import {
  platform_ready,
  register_copy,
  register_copyjsonfile,
  register_forkmem,
  register_loginready,
  register_savemem,
  api_log,
  vm_codeaddress,
  vm_flush,
  vm_logout,
  register_loginfail,
  vm_local,
} from './api'
import { modemobservevaluestring } from './modem'

// tracking active player ids
const SECOND_TIMEOUT = 16 // timeout after 16 seconds
const tracking: Record<string, number> = {}
const trackinglastlog: Record<string, number> = {}

// control how fast we persist to the register
// this __should__ autosave every minute
const FLUSH_RATE = 60
let flushtick = 0

// track watched memory
const watching: Record<string, Set<string>> = {}
const observers: Record<string, MAYBE<UNOBSERVE_FUNC>> = {}

// save state
async function savestate(autosave?: boolean) {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    const content = await compressbooks(books)
    const historylabel = `${autosave ? 'autosave ' : ''}${new Date().toISOString()} ${mainbook.name} ${content.length} chars`
    register_savemem(vm, memoryreadoperator(), historylabel, content)
  }
}

// fork state
async function forkstate() {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    const content = await compressbooks(books)
    register_forkmem(vm, memoryreadoperator(), content)
  }
}

const vm = createdevice(
  'vm',
  ['tick', 'second'],
  (message) => {
    if (!vm.session(message)) {
      return
    }
    const operator = memoryreadoperator()
    switch (message.target) {
      case 'operator':
        memorywriteoperator(message.player)
        api_log(vm, message.player, `operator set to ${message.player}`)
        // ack
        vm.replynext(message, 'ackoperator', true)
        break
      case 'zsswords': {
        const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        vm.replynext(message, `ackzsswords`, {
          cli: firmwarelistcommands(DRIVER_TYPE.CLI),
          loader: firmwarelistcommands(DRIVER_TYPE.LOADER),
          runtime: firmwarelistcommands(DRIVER_TYPE.RUNTIME),
          flags: [
            ...objectKeys(memoryreadflags(message.player)),
            'inputmove',
            'inputalt',
            'inputctrl',
            'inputshift',
            'inputok',
            'inputcancel',
            'inputmenu',
          ],
          stats: [
            // board stats
            'isdark',
            'notdark',
            'startx',
            'starty',
            'over',
            'under',
            'camera',
            'graphics',
            'facing',
            'exitnorth',
            'exitsouth',
            'exitwest',
            'exiteast',
            'timelimit',
            'restartonzap',
            'norestartonzap',
            'maxplayershots',
            // element stats
            // interaction
            'player',
            'pushable',
            'collision',
            'breakable',
            // boolean stats
            'ispushable',
            'notpushable',
            'iswalk',
            'iswalking',
            'iswalkable',
            'isswim',
            'isswimming',
            'isswimable',
            'issolid',
            'isbullet',
            'isbreakable',
            'notbreakable',
            // config
            'p1',
            'p2',
            'p3',
            'cycle',
            'stepx',
            'stepy',
            'light',
            'lightdir',
            // messages & run
            'sender',
            'arg',
          ],
          // object codepage kinds
          kinds: [
            ...bookreadcodepagesbytype(mainbook, CODE_PAGE_TYPE.OBJECT).map(
              (codepage) => codepagereadname(codepage),
            ),
            ...objectKeys(categoryconsts),
          ],
          // other codepage types
          altkinds: [
            ...bookreadcodepagesbytype(mainbook, CODE_PAGE_TYPE.TERRAIN),
            ...bookreadcodepagesbytype(mainbook, CODE_PAGE_TYPE.BOARD),
            ...bookreadcodepagesbytype(mainbook, CODE_PAGE_TYPE.PALETTE),
            ...bookreadcodepagesbytype(mainbook, CODE_PAGE_TYPE.CHARSET),
            ...bookreadcodepagesbytype(mainbook, CODE_PAGE_TYPE.LOADER),
          ].map((codepage) => codepagereadname(codepage)),
          colors: [...objectKeys(colorconsts)],
          dirs: [
            ...objectKeys(dirconsts).filter(
              (item) => ['cw', 'ccw', 'oop', 'rndp'].includes(item) === false,
            ),
          ],
          dirmods: ['cw', 'ccw', 'oop', 'rndp', ...objectKeys(collisionconsts)],
        })
        break
      }
      case 'books':
        if (message.player === operator) {
          doasync(vm, message.player, async () => {
            if (isarray(message.data)) {
              const [maybebooks, maybeselect] = message.data as [string, string]
              // unpack books
              const books = await decompressbooks(maybebooks)
              const booknames = books.map((item) => item.name)
              memoryresetbooks(books, maybeselect)
              api_log(vm, message.player, `loading ${booknames.join(', ')}`)
              // ack
              register_loginready(vm, message.player)
            }
          })
        }
        break
      case 'search':
        if (!memoryreadplayeractive(message.player)) {
          register_loginready(vm, message.player)
        }
        break
      case 'logout':
        // logout player
        memoryplayerlogout(message.player)
        // stop tracking
        delete tracking[message.player]
        api_log(vm, operator, `player ${message.player} logout`)
        // ack
        register_loginready(vm, message.player)
        break
      case 'login':
        // attempt login
        if (memoryplayerlogin(message.player)) {
          // start tracking
          tracking[message.player] = 0
          api_log(vm, memoryreadoperator(), `login from ${message.player}`)
          // ack
          vm.replynext(message, 'acklogin', true)
        } else {
          // signal failure
          register_loginfail(vm, message.player)
        }
        break
      case 'local':
        // attempt login
        if (memoryplayerlogin(message.player)) {
          // start tracking
          tracking[message.player] = 0
          api_log(vm, memoryreadoperator(), `login from ${message.player}`)
        } else {
          // signal failure
          register_loginfail(vm, message.player)
        }
        break
      case 'doot':
        // player keepalive
        tracking[message.player] = 0
        trackinglastlog[message.player] = trackinglastlog[message.player] ?? 0
        if (trackinglastlog[message.player] % 32 === 0) {
          api_log(vm, message.player, `$whiteactive $blue${message.player}`)
        }
        ++trackinglastlog[message.player]
        break
      case 'input': {
        if (
          message.player.includes('local') &&
          !memoryhasflags(message.player)
        ) {
          vm_local(vm, message.player)
        }
        if (
          !message.player.includes('local') ||
          memoryhasflags(message.player)
        ) {
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
      }
      case 'codewatch':
        if (isarray(message.data)) {
          const [book, path] = message.data
          const address = vm_codeaddress(book, path)
          // start watching
          if (!ispresent(observers[address])) {
            observers[address] = modemobservevaluestring(address, (value) => {
              // parse path
              const [codepage, maybeobject] = path
              // write to code
              const contentbook = memoryreadbookbyaddress(book)
              const content = bookreadcodepagebyaddress(contentbook, codepage)
              if (ispresent(content)) {
                if (
                  codepagereadtype(content) === CODE_PAGE_TYPE.BOARD &&
                  ispresent(maybeobject)
                ) {
                  const board = codepagereaddata<CODE_PAGE_TYPE.BOARD>(content)
                  const object = boardobjectread(board, maybeobject)
                  if (ispresent(object)) {
                    // TODO parse code for stats and update element name
                    object.code = value
                    codepageapplyelementstats(
                      codepagereadstatsfromtext(value),
                      object,
                    )
                  }
                } else {
                  content.code = value
                  // re-parse code for @ attrs and expected data type
                  codepageresetstats(content)
                }
              }
            })
          }
          // track use
          watching[address] = watching[address] ?? new Set()
          watching[address].add(message.player)
        }
        break
      case 'coderelease':
        if (isarray(message.data)) {
          const [book, path] = message.data
          // parse path
          const [, maybeobject] = path
          const address = vm_codeaddress(book, path)
          // stop watching
          if (ispresent(watching[address])) {
            watching[address].delete(message.player)
            // stop watching
            if (watching[address].size === 0) {
              observers[address]?.()
              observers[address] = undefined
              // nuke chip for object when we are no longer editing
              if (isstring(maybeobject)) {
                memoryresetchipafteredit(maybeobject)
              }
            }
          }
        }
        break
      case 'halt':
        if (message.player === operator && isboolean(message.data)) {
          memorywritehalt(message.data)
        }
        break
      case 'tick':
        if (!memoryreadhalt()) {
          memorytick()
        }
        break
      case 'synthsend':
        if (isstring(message.data)) {
          const [target, label] = totarget(message.data)
          memorysendtoactiveboards(target, label, undefined)
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
        if (++flushtick >= FLUSH_RATE) {
          flushtick = 0
          doasync(vm, message.player, async () => {
            await savestate(true)
          })
        }
        break
      }
      case 'copyjsonfile':
        if (message.player === operator) {
          const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
          if (ispresent(mainbook) && isarray(message.data)) {
            const [address] = message.data
            const codepage = bookreadcodepagebyaddress(mainbook, address)
            if (ispresent(codepage)) {
              register_copyjsonfile(
                vm,
                operator,
                codepage,
                `${codepagereadname(codepage)}.${codepagereadtypetostring(codepage)}.json`,
              )
            }
          }
        }
        break
      case 'refscroll': {
        gadgettext(message.player, `stat refs`)
        gadgettext(message.player, DIVIDER)
        gadgethyperlink(message.player, 'refscroll', `char:`, [
          'charscroll',
          'hk',
          'a',
          ' A ',
          'next',
        ])
        gadgethyperlink(message.player, 'refscroll', `color:`, [
          'colorscroll',
          'hk',
          'c',
          ' C ',
          'next',
        ])
        const shared = gadgetstate(message.player)
        shared.scroll = gadgetcheckqueue(message.player)
        break
      }
      case 'fork':
        if (message.player === operator) {
          doasync(vm, message.player, async () => {
            await forkstate()
          })
        }
        break
      case 'flush':
        if (message.player === operator) {
          doasync(vm, message.player, async () => {
            await savestate()
          })
        }
        break
      case 'cli':
        // user input from built-in console
        memorycli(message.player, message.data)
        break
      case 'clirepeatlast':
        // repeat user input from built-in console
        memoryclirepeatlast(message.player)
        break
      case 'clirepeatslot':
        if (isnumber(message.data)) {
          memoryclirepeatslot(message.player, message.data)
        }
        break
      case 'restart':
        if (message.player === operator) {
          memoryrestartallchipsandflags()
          vm_flush(vm, message.player)
        }
        break
      case 'inspect':
        if (isarray(message.data)) {
          const [p1, p2] = message.data as [PT, PT]
          memoryinspect(message.player, p1, p2)
        }
        break
      case 'loader':
        // user input from built-in console
        // or events from devices
        if (isarray(message.data)) {
          const [arg, format, eventname, content] = message.data
          if (format === 'file') {
            // handled web file pastes
            parsewebfile(message.player, content)
          } else if (
            format === 'json' &&
            /file:.*\.book.json/.test(eventname)
          ) {
            api_log(vm, message.player, `loading ${eventname}`)
            const json = JSON.parse(content.json)
            const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
            if (
              ispresent(mainbook) &&
              ispresent(json.data) &&
              isstring(json.exported)
            ) {
              memorysetbook(json.data)
              api_log(vm, message.player, `loaded ${json.exported}`)
            }
          } else if (format === 'json' && /file:.*\..*\.json/.test(eventname)) {
            api_log(vm, message.player, `loading ${eventname}`)
            const json = JSON.parse(content.json)
            const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
            if (
              ispresent(mainbook) &&
              ispresent(json.data) &&
              isstring(json.exported)
            ) {
              bookwritecodepage(mainbook, json.data)
              api_log(vm, message.player, `loaded ${json.exported}`)
            }
          } else {
            // everything else
            memoryloader(arg, format, eventname, content, message.player)
          }
        }
        break
      default: {
        const { target, path } = parsetarget(message.target)
        switch (NAME(target)) {
          case 'refscroll':
            switch (path) {
              case 'charscroll': {
                gadgethyperlink(message.player, 'refscroll', 'char', [
                  'char',
                  'charedit',
                ])
                const shared = gadgetstate(message.player)
                shared.scroll = gadgetcheckqueue(message.player)
                break
              }
              case 'colorscroll': {
                gadgethyperlink(message.player, 'refscroll', 'color', [
                  'color',
                  'coloredit',
                ])
                const shared = gadgetstate(message.player)
                shared.scroll = gadgetcheckqueue(message.player)
                break
              }
            }
            break
          case 'batch':
            memoryinspectbatchcommand(path, message.player)
            break
          case 'empty': {
            const empty = parsetarget(path)
            switch (empty.target) {
              case 'copycoords':
                register_copy(
                  vm,
                  memoryreadoperator(),
                  empty.path.split(',').join(' '),
                )
                break
            }
            break
          }
          case 'inspect':
            memoryinspectcommand(path, message.player)
            break
          case 'touched':
            if (isarray(message.data)) {
              const [toid, from, target] = message.data
              memorymessage({
                ...message,
                target: `${toid}:${target}`,
                data: undefined,
                sender: from,
              })
            }
            break
          default:
            // running software messages
            memorymessage(message)
            break
        }
        break
      }
    }
  },
  memoryreadsession(),
)

export function started() {
  // signal ready state
  platform_ready(vm)
}
