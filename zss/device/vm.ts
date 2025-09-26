import { objectKeys } from 'ts-extras'
import { createdevice, parsetarget } from 'zss/device'
import { fetchwiki } from 'zss/feature/parse/fetchwiki'
import {
  markzipfilelistitem,
  parsewebfile,
  parsezipfilelist,
  readzipfilelist,
  readzipfilelistitem,
} from 'zss/feature/parse/file'
import { parsemarkdownforscroll } from 'zss/feature/parse/markdownscroll'
import { romparse, romread, romscroll } from 'zss/feature/rom'
import {
  MOSTLY_ZZT_META,
  museumofzztdownload,
  museumofzztrandom,
  museumofzztscreenshoturl,
  museumofzztsearch,
} from 'zss/feature/url'
import { DRIVER_TYPE, firmwarelistcommands } from 'zss/firmware/runner'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { INPUT, UNOBSERVE_FUNC } from 'zss/gadget/data/types'
import { doasync } from 'zss/mapping/func'
import { randominteger } from 'zss/mapping/number'
import { totarget } from 'zss/mapping/string'
import {
  MAYBE,
  isarray,
  isboolean,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import {
  MEMORY_LABEL,
  memorycli,
  memoryclirepeatlast,
  memoryhasflags,
  memorymessage,
  memoryplayerlogin,
  memoryplayerlogout,
  memoryplayerscan,
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadflags,
  memoryreadhalt,
  memoryreadoperator,
  memoryreadplayeractive,
  memoryreadsession,
  memoryresetbooks,
  memoryresetchipafteredit,
  memoryrestartallchipsandflags,
  memorysendtoboards,
  memorysetbook,
  memorytick,
  memorywritehalt,
  memorywriteoperator,
} from 'zss/memory'
import { boardobjectread } from 'zss/memory/board'
import {
  bookreadcodepagebyaddress,
  bookreadcodepagesbytype,
  bookwritecodepage,
} from 'zss/memory/book'
import { bookplayerreadboards } from 'zss/memory/bookplayer'
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
import { memoryinspectremixcommand } from 'zss/memory/inspectremix'
import { memoryloader } from 'zss/memory/loader'
import { memorymakeitcommand, memorymakeitscroll } from 'zss/memory/makeit'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { categoryconsts } from 'zss/words/category'
import { collisionconsts } from 'zss/words/collision'
import { colorconsts } from 'zss/words/color'
import { dirconsts } from 'zss/words/dir'
import { NAME, PT } from 'zss/words/types'

import {
  api_log,
  platform_ready,
  register_copy,
  register_copyjsonfile,
  register_forkmem,
  register_itchiopublishmem,
  register_loginfail,
  register_loginready,
  register_savemem,
  vm_codeaddress,
  vm_flush,
  vm_local,
  vm_logout,
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

// fork state
async function compressedbookstate() {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    return compressbooks(books)
  }
  return ''
}

const ZZT_BRIDGE = `$176$176$177$177$178 ZZT BRIDGE $178$177$177$176$176`

function writezztcontentwait(player: string) {
  gadgettext(player, `Searching ${'$6'.repeat(randominteger(1, 6))}`)
  const shared = gadgetstate(player)
  shared.scrollname = ZZT_BRIDGE
  shared.scroll = gadgetcheckqueue(player)
}

function writezztcontentlinks(list: MOSTLY_ZZT_META[], player: string) {
  for (let i = 0; i < list.length; ++i) {
    const entry = list[i]
    const pubtag = `pub: ${new Date(entry.publish_date).toLocaleDateString()}`
    gadgettext(player, `$white${entry.title}`)
    gadgettext(player, `$yellow  ${entry.author.join(', ')}`)
    gadgettext(player, `$dkgreen  ${entry.genres.join(', ')}`)
    gadgettext(player, `$purple  ${pubtag}`)
    if (entry.screenshot) {
      gadgethyperlink(player, 'zztbridge', entry.screenshot, [
        'screenshot',
        'viewit',
        museumofzztscreenshoturl(entry.screenshot),
      ])
    }
    gadgethyperlink(player, 'zztbridge', entry.filename, [
      'zztimport',
      '',
      `${entry.letter}/${entry.filename}`,
    ])
    gadgettext(player, ' ')
  }
  const shared = gadgetstate(player)
  shared.scrollname = ZZT_BRIDGE
  shared.scroll = gadgetcheckqueue(player)
}

// when we have multiple players, hearing music, we get multiple synth sends
// so we have to debounce to X number of ticks ?
const synthdebounce: Record<string, number> = {}

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
            'didshoot',
          ],
          stats: [
            // board stats
            'currenttick',
            'boardid',
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
            'b1',
            'b2',
            'b3',
            'b4',
            'b5',
            'b6',
            'b7',
            'b8',
            'b9',
            'b10',
            // helper stats
            'playerid',
            'playerx',
            'playery',
            'thisid',
            'thisx',
            'thisy',
            // sender helpers
            'senderid',
            'senderx',
            'sendery',
            // element stats
            // interaction
            'item',
            'group',
            'party',
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
            'isghost',
            'isbreakable',
            'notbreakable',
            // config
            'p1',
            'p2',
            'p3',
            'p4',
            'p5',
            'p6',
            'p7',
            'p8',
            'p9',
            'p10',
            'cycle',
            'stepx',
            'stepy',
            'shootx',
            'shooty',
            'light',
            'lightdir',
            // set on runwith
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
          exprs: [
            'aligned',
            'alligned',
            'contact',
            'blocked',
            'any',
            'countof',
            'color',
            'detect',
            'rnd',
            'abs',
            'intceil',
            'intfloor',
            'intround',
            'clamp',
            'min',
            'max',
            'pick',
            'pickwith',
            'random',
            'randomwith',
            'run',
            'runwith',
          ],
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
      case 'tick': {
        memorytick(memoryreadhalt())
        const signals = objectKeys(synthdebounce)
        for (let i = 0; i < signals.length; ++i) {
          const key = signals[i]
          --synthdebounce[key]
        }
        break
      }
      case 'synthsend':
        if (isstring(message.data)) {
          const messagestr = message.data
          // throttle synthsends because multipla players
          const [target, label] = totarget(messagestr)
          const signal = synthdebounce[messagestr]
          if (!ispresent(signal) || signal <= 0) {
            synthdebounce[messagestr] = 2
            const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
            memorysendtoboards(
              target,
              label,
              undefined,
              bookplayerreadboards(mainbook),
            )
          }
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
      case 'makeitscroll':
        if (isstring(message.data)) {
          memorymakeitscroll(message.data, message.player)
        }
        break
      case 'refscroll': {
        romparse(romread(`refscroll:menu`), (line) =>
          romscroll(message.player, line),
        )
        const shared = gadgetstate(message.player)
        shared.scrollname = 'refscroll'
        shared.scroll = gadgetcheckqueue(message.player)
        break
      }
      case 'readzipfilelist': {
        const list = readzipfilelist()
        gadgettext(message.player, `$CENTER Select Files`)
        gadgethyperlink(message.player, 'zipfilelist', `import selected`, [
          'importfiles',
        ])
        for (let i = 0; i < list.length; ++i) {
          const [type, filename] = list[i]
          if (!type) {
            continue
          }
          gadgettext(message.player, filename)
          gadgethyperlink(
            message.player,
            'zipfilelist',
            `[${type}]`,
            [NAME(filename), 'select', 'NO', '0', 'YES', '1'],
            (name: string) => {
              // console.info(name)
              return readzipfilelistitem(name) ? 1 : 0
            },
            (name, value) => {
              // console.info('set', name, value)
              markzipfilelistitem(name, !!value)
            },
          )
        }
        const shared = gadgetstate(message.player)
        shared.scrollname = 'zipfilelist'
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
      case 'zztsearch':
        doasync(vm, message.player, async () => {
          if (isarray(message.data)) {
            const [field, text] = message.data as [string, string]
            let offset = 0
            const result: MOSTLY_ZZT_META[] = []
            while (result.length < 256) {
              writezztcontentwait(message.player)
              const list = await museumofzztsearch(field, text, offset)
              offset += list.length
              result.push(...list)
              if (list.length < 25) {
                break
              }
            }
            writezztcontentlinks(result, message.player)
          }
        })
        break
      case 'zztrandom':
        doasync(vm, message.player, async () => {
          writezztcontentwait(message.player)
          const list = await museumofzztrandom()
          writezztcontentlinks(list, message.player)
        })
        break
      case 'itchiopublish':
        doasync(vm, message.player, async () => {
          if (message.player === operator) {
            const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
            if (ispresent(mainbook)) {
              const content = await compressedbookstate()
              register_itchiopublishmem(
                vm,
                message.player,
                mainbook.name,
                content,
              )
            }
          }
        })
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
      case 'restart':
        if (message.player === operator) {
          memoryrestartallchipsandflags()
          vm_flush(vm, message.player)
        }
        break
      case 'inspect':
        doasync(vm, message.player, async () => {
          if (isarray(message.data)) {
            const [p1, p2] = message.data as [PT, PT]
            await memoryinspect(message.player, p1, p2)
          }
        })
        break
      case 'loader':
        // user input from built-in console
        // or events from devices
        if (isarray(message.data)) {
          const [arg, format, eventname, content] = message.data
          switch (format) {
            case 'file':
              parsewebfile(message.player, content)
              break
            case 'json':
              if (/file:.*\.book.json/.test(eventname)) {
                // import exported book
                api_log(vm, message.player, `loading ${eventname}`)
                const json = JSON.parse(content.json)
                // const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
                if (
                  // ispresent(mainbook) &&
                  ispresent(json.data) &&
                  isstring(json.exported)
                ) {
                  memorysetbook(json.data)
                  api_log(vm, message.player, `loaded ${json.exported}`)
                }
              } else if (/file:.*\..*\.codepage.json/.test(eventname)) {
                // import exported codepage
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
              break
            default:
              // everything else
              memoryloader(arg, format, eventname, content, message.player)
              break
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
                shared.scrollname = 'chars'
                shared.scroll = gadgetcheckqueue(message.player)
                break
              }
              case 'colorscroll': {
                gadgethyperlink(message.player, 'refscroll', 'color', [
                  'color',
                  'coloredit',
                ])
                const shared = gadgetstate(message.player)
                shared.scrollname = 'colors'
                shared.scroll = gadgetcheckqueue(message.player)
                break
              }
              case 'bgscroll': {
                gadgethyperlink(message.player, 'refscroll', 'bg', [
                  'bg',
                  'bgedit',
                ])
                const shared = gadgetstate(message.player)
                shared.scrollname = 'bgs'
                shared.scroll = gadgetcheckqueue(message.player)
                break
              }
              default: {
                doasync(vm, message.player, async () => {
                  const content = romread(`refscroll:${path}`)
                  if (!ispresent(content)) {
                    const shared = gadgetstate(message.player)
                    shared.scrollname = '$7$7$7 please wait'
                    shared.scroll = ['loading $7$7$7']
                    const markdowntext = await fetchwiki(path)
                    parsemarkdownforscroll(message.player, markdowntext)
                  } else {
                    romparse(romread(`refscroll:${path}`), (line) =>
                      romscroll(message.player, line),
                    )
                  }
                  const shared = gadgetstate(message.player)
                  shared.scrollname = path
                  shared.scroll = gadgetcheckqueue(message.player)
                })
                break
              }
            }
            break
          case 'batch':
            doasync(vm, message.player, async () => {
              await memoryinspectbatchcommand(path, message.player)
            })
            break
          case 'remix':
            doasync(vm, message.player, async () => {
              await memoryinspectremixcommand(path, message.player)
            })
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
          case 'makeit':
            memorymakeitcommand(path, message.data ?? '', message.player)
            break
          case 'touched':
            if (isarray(message.data)) {
              const [senderidorindex, toelementid, target] = message.data as [
                string,
                string,
                string,
              ]
              memorymessage({
                ...message,
                target: `${toelementid}:${target}`,
                data: undefined,
                sender: senderidorindex,
              })
            }
            break
          case 'zztbridge':
            doasync(vm, message.player, async () => {
              if (isarray(message.data)) {
                const [filename] = message.data
                await museumofzztdownload(message.player, filename)
              }
            })
            break
          case 'zipfilelist':
            doasync(vm, message.player, async () => {
              await parsezipfilelist(message.player)
            })
            break
          default: {
            const invoke = parsetarget(path)
            // running software messages
            if (NAME(invoke.target) === 'self' || !invoke.path) {
              // chop off self:
              message.target = message.target.replace('self:', '')
              memorymessage(message)
            } else {
              const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
              memorysendtoboards(
                invoke.target,
                invoke.path,
                undefined,
                bookplayerreadboards(mainbook),
              )
            }
            break
          }
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
