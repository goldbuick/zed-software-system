import { objectKeys } from 'ts-extras'
import { createdevice, parsetarget } from 'zss/device'
import { fetchwiki } from 'zss/feature/fetchwiki'
import {
  markzipfilelistitem,
  parsewebfile,
  parsezipfilelist,
  readzipfilelist,
  readzipfilelistitem,
} from 'zss/feature/parse/file'
import { parsemarkdownforscroll } from 'zss/feature/parse/markdownscroll'
import { romparse, romread, romscroll } from 'zss/feature/rom'
import { storagereadconfig } from 'zss/feature/storage'
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
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryhasflags,
  memorylistcodepagewithtype,
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadflags,
  memoryreadhalt,
  memoryreadoperator,
  memoryreadsession,
  memoryresetbooks,
  memorywritebook,
  memorywritehalt,
  memorywriteoperator,
  memorywritetopic,
} from 'zss/memory'
import { memoryreadobject } from 'zss/memory/boardoperations'
import {
  memorylistcodepagebytype,
  memoryreadcodepage,
  memorywritecodepage,
} from 'zss/memory/bookoperations'
import {
  memoryapplyelementstats,
  memoryreadcodepagedata,
  memoryreadcodepagename,
  memoryreadcodepagestatsfromtext,
  memoryreadcodepagetype,
  memoryresetcodepagestats,
} from 'zss/memory/codepageoperations'
import { memorysendtoboards } from 'zss/memory/gamesend'
import { memoryinspect, memoryinspectcommand } from 'zss/memory/inspection'
import { memoryinspectbatchcommand } from 'zss/memory/inspectionbatch'
import {
  FINDANY_CONFIG,
  memoryfindany,
  memoryfindanymenu,
} from 'zss/memory/inspectionfind'
import {
  memorymakeitcommand,
  memorymakeitscroll,
} from 'zss/memory/inspectionmakeit'
import { memoryinspectremixcommand } from 'zss/memory/inspectionremix'
import { memoryloader } from 'zss/memory/loader'
import {
  memoryloginplayer,
  memorylogoutplayer,
  memorymoveplayertoboard,
  memoryreadbookplayerboards,
  memoryreadplayeractive,
  memoryreadplayerboard,
  memoryscanplayers,
} from 'zss/memory/playermanagement'
import {
  memoryhaltchip,
  memorymessagechip,
  memoryrepeatclilast,
  memoryrestartallchipsandflags,
  memoryruncli,
  memorytickmain,
  memoryunlockscroll,
} from 'zss/memory/runtime'
import { BOOK, CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'
import {
  memoryadminmenu,
  memorycompressbooks,
  memorydecompressbooks,
} from 'zss/memory/utilities'
import { categoryconsts } from 'zss/words/category'
import { collisionconsts } from 'zss/words/collision'
import { colorconsts } from 'zss/words/color'
import { dirconsts } from 'zss/words/dir'
import { NAME, PT } from 'zss/words/types'

import {
  apilog,
  platformready,
  registercopy,
  registerforkmem,
  registerinspector,
  registerloginfail,
  registerloginready,
  registerpublishmem,
  registersavemem,
  vmclearscroll,
  vmcli,
  vmcodeaddress,
  vmflush,
  vmloader,
  vmlocal,
  vmlogout,
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
    const compressed = await memorycompressbooks(books)
    const historylabel = `${autosave ? 'autosave ' : ''}${new Date().toISOString()} ${mainbook.name} ${compressed.length} chars`
    registersavemem(vm, memoryreadoperator(), historylabel, compressed, books)
  }
}

// fork state
async function forkstate(transfer: string) {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    const content = await memorycompressbooks(books)
    registerforkmem(vm, memoryreadoperator(), content, transfer)
  }
}

// fork state
async function compressedbookstate() {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    return await memorycompressbooks(books)
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
        // setup op
        memorywriteoperator(message.player)
        apilog(vm, message.player, `operator set to ${message.player}`)
        // ack
        vm.replynext(message, 'ackoperator', true)
        break
      case 'topic':
        if (isstring(message.data)) {
          memorywritetopic(message.data)
        }
        break
      case 'admin':
        doasync(vm, message.player, async () => {
          await memoryadminmenu(message.player)
        })
        break
      case 'zsswords': {
        const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        const dirmods = [
          'cw',
          'ccw',
          'oop',
          'rndp',
          'to',
          'over',
          'under',
          'ground',
          'within',
          'awayby',
          'elements',
        ]
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
            'charset',
            'palette',
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
            ...memorylistcodepagebytype(mainbook, CODE_PAGE_TYPE.OBJECT).map(
              (codepage) => memoryreadcodepagename(codepage),
            ),
            ...objectKeys(categoryconsts),
          ],
          // other codepage types
          altkinds: [
            ...memorylistcodepagebytype(mainbook, CODE_PAGE_TYPE.TERRAIN),
            ...memorylistcodepagebytype(mainbook, CODE_PAGE_TYPE.BOARD),
            ...memorylistcodepagebytype(mainbook, CODE_PAGE_TYPE.PALETTE),
            ...memorylistcodepagebytype(mainbook, CODE_PAGE_TYPE.CHARSET),
            ...memorylistcodepagebytype(mainbook, CODE_PAGE_TYPE.LOADER),
          ].map((codepage) => memoryreadcodepagename(codepage)),
          colors: [...objectKeys(colorconsts)],
          dirs: [
            ...objectKeys(dirconsts).filter(
              (item) => dirmods.includes(item) === false,
            ),
          ],
          dirmods: [...dirmods, ...objectKeys(collisionconsts)],
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
            let books: BOOK[] = []
            if (isarray(message.data)) {
              // server mode loading books
              books = message.data
            } else if (isstring(message.data)) {
              // browser mode loading books
              books = await memorydecompressbooks(message.data)
            }
            const booknames = books.map((item) => item.name)
            apilog(vm, message.player, `loading ${booknames.join(', ')}`)
            memoryresetbooks(books)
            // ack
            registerloginready(vm, message.player)
          })
        }
        break
      case 'search':
        if (!memoryreadplayeractive(message.player)) {
          registerloginready(vm, message.player)
        }
        break
      case 'logout':
        // clear scroll locks
        vmclearscroll(vm, message.player)
        // logout player
        memorylogoutplayer(message.player, !!message.data)
        // stop tracking
        delete tracking[message.player]
        apilog(vm, operator, `player ${message.player} logout`)
        // ack
        registerloginready(vm, message.player)
        break
      case 'login':
        // attempt login
        if (memoryloginplayer(message.player, message.data)) {
          // start tracking
          tracking[message.player] = 0
          apilog(vm, memoryreadoperator(), `login from ${message.player}`)
          // ack
          vm.replynext(message, 'acklogin', true)
        } else {
          // signal failure
          registerloginfail(vm, message.player)
        }
        break
      case 'local':
        // attempt login
        if (memoryloginplayer(message.player, {})) {
          // start tracking
          tracking[message.player] = 0
          apilog(vm, memoryreadoperator(), `login from ${message.player}`)
        } else {
          // signal failure
          registerloginfail(vm, message.player)
        }
        break
      case 'doot':
        // player keepalive
        tracking[message.player] = 0
        trackinglastlog[message.player] = trackinglastlog[message.player] ?? 0
        if (trackinglastlog[message.player] % 32 === 0) {
          apilog(vm, message.player, `$whiteactive $blue${message.player}`)
        }
        ++trackinglastlog[message.player]
        break
      case 'input': {
        if (
          message.player.includes('local') &&
          !memoryhasflags(message.player)
        ) {
          vmlocal(vm, message.player)
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
      case 'look': {
        const board = memoryreadplayerboard(message.player)
        const gadget = gadgetstate(message.player)
        vm.reply(message, 'acklook', {
          board,
          tickers: gadget.tickers ?? [],
          scrollname: gadget.scrollname ?? '',
          scroll: gadget.scroll ?? [],
          sidebar: gadget.sidebar ?? [],
        })
        break
      }
      case 'codewatch':
        if (isarray(message.data)) {
          const [book, path] = message.data
          const address = vmcodeaddress(book, path)
          // start watching
          if (!ispresent(observers[address])) {
            observers[address] = modemobservevaluestring(address, (value) => {
              // parse path
              const [codepage, maybeobject] = path
              // write to code
              const contentbook = memoryreadbookbyaddress(book)
              const content = memoryreadcodepage(contentbook, codepage)
              if (ispresent(content)) {
                if (
                  memoryreadcodepagetype(content) === CODE_PAGE_TYPE.BOARD &&
                  ispresent(maybeobject)
                ) {
                  const board =
                    memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(content)
                  const object = memoryreadobject(board, maybeobject)
                  if (ispresent(object)) {
                    // TODO parse code for stats and update element name
                    object.code = value
                    memoryapplyelementstats(
                      memoryreadcodepagestatsfromtext(value),
                      object,
                    )
                  }
                } else {
                  content.code = value
                  // re-parse code for @ attrs and expected data type
                  memoryresetcodepagestats(content)
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
          const address = vmcodeaddress(book, path)
          // stop watching
          if (ispresent(watching[address])) {
            watching[address].delete(message.player)
            // stop watching
            if (watching[address].size === 0) {
              observers[address]?.()
              observers[address] = undefined
              // nuke chip for object when we are no longer editing
              if (isstring(maybeobject)) {
                memoryhaltchip(maybeobject)
              }
            }
          }
        }
        break
      case 'clearscroll': {
        const maybeboard = memoryreadplayerboard(message.player)
        if (ispresent(maybeboard)) {
          const objids = Object.keys(maybeboard.objects)
          for (let i = 0; i < objids.length; ++i) {
            memoryunlockscroll(objids[i], message.player)
          }
        }
        break
      }
      case 'halt':
        if (message.player === operator) {
          const halt = memoryreadhalt() ? false : true
          memorywritehalt(halt)
          apilog(
            vm,
            message.player,
            `#dev mode is ${halt ? '$greenon' : '$redoff'}`,
          )
          registerinspector(vm, message.player, halt)
        }
        break
      case 'tick': {
        memorytickmain(memoryreadhalt())
        break
      }
      case 'second': {
        // ensure player ids are added to tracking
        // this manages restoring from saved or transfered state
        memoryscanplayers(tracking)

        // list of player ids
        const players = Object.keys(tracking)

        // update tracking counts
        for (let i = 0; i < players.length; ++i) {
          ++tracking[players[i]]
        }

        // check for timeouts
        for (let i = 0; i < players.length; ++i) {
          const player = players[i]
          if (tracking[player] >= SECOND_TIMEOUT) {
            // drop lagged players from tracking
            vmlogout(vm, player, false)
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
        shared.scrollname = '#help or $meta+h'
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
            await forkstate(message.data)
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
      case 'publish':
        doasync(vm, message.player, async () => {
          if (message.player === operator && isarray(message.data)) {
            const content = await compressedbookstate()
            registerpublishmem(vm, message.player, content, ...message.data)
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
        memoryruncli(message.player, message.data)
        break
      case 'clirepeatlast':
        // repeat user input from built-in console
        memoryrepeatclilast(message.player)
        break
      case 'restart':
        if (message.player === operator) {
          memoryrestartallchipsandflags()
          vmflush(vm, message.player)
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
      case 'findany':
        doasync(vm, message.player, async () => {
          await memoryfindanymenu(message.player)
        })
        break
      case 'loader':
        // user input from built-in console
        // or events from devices
        if (isarray(message.data)) {
          const [arg, format, eventname, content] = message.data
          doasync(vm, message.player, async () => {
            if ((await storagereadconfig('loaderlogging')) === 'on') {
              console.info('loader event', eventname, format, arg, content)
              apilog(vm, message.player, `loader event ${eventname} ${format}`)
            }
          })
          switch (format) {
            case 'file':
              parsewebfile(message.player, content)
              break
            case 'json':
              if (/file:.*\.book.json/.test(eventname)) {
                // import exported book
                apilog(vm, message.player, `loading ${eventname}`)
                const json = JSON.parse(content.json)
                // const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
                if (
                  // ispresent(mainbook) &&
                  ispresent(json.data) &&
                  isstring(json.exported)
                ) {
                  memorywritebook(json.data)
                  apilog(vm, message.player, `loaded ${json.exported}`)
                }
              } else if (/file:.*\..*\.codepage.json/.test(eventname)) {
                // import exported codepage
                apilog(vm, message.player, `loading ${eventname}`)
                const json = JSON.parse(content.json)
                const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
                if (
                  ispresent(mainbook) &&
                  ispresent(json.data) &&
                  isstring(json.exported)
                ) {
                  memorywritecodepage(mainbook, json.data)
                  apilog(vm, message.player, `loaded ${json.exported}`)
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
          case 'adminop': {
            switch (path) {
              case 'dev':
                vmcli(vm, message.player, '#dev')
                break
              case 'gadget':
                vmcli(vm, message.player, '#gadget')
                break
              case 'joincode':
                vmcli(vm, message.player, '#joincode')
                break
            }
            break
          }
          case 'admingoto': {
            // path is player id
            const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
            const playerboard = memoryreadplayerboard(path)
            const playerelement = memoryreadobject(playerboard, path)
            if (ispresent(playerboard) && ispresent(playerelement)) {
              const dest = {
                x: playerelement.x ?? 0,
                y: playerelement.y ?? 0,
              }
              memorymoveplayertoboard(
                mainbook,
                message.player,
                playerboard.id,
                dest,
              )
            }
            break
          }
          case 'refscroll':
            switch (path) {
              case 'adminscroll':
                doasync(vm, message.player, async () => {
                  await memoryadminmenu(message.player)
                })
                break
              case 'objectlistscroll': {
                const pages = memorylistcodepagewithtype(CODE_PAGE_TYPE.OBJECT)
                for (let i = 0; i < pages.length; ++i) {
                  const codepage = pages[i]
                  const name = memoryreadcodepagename(codepage)
                  const lines = codepage.code.split('\n').slice(0, 2)
                  gadgethyperlink(
                    message.player,
                    'list',
                    `@${name}$ltgrey ${lines[1] ?? ''}`,
                    ['copyit', name],
                  )
                }
                const shared = gadgetstate(message.player)
                shared.scrollname = 'object list'
                shared.scroll = gadgetcheckqueue(message.player)
                break
              }
              case 'terrainlistscroll': {
                const pages = memorylistcodepagewithtype(CODE_PAGE_TYPE.TERRAIN)
                for (let i = 0; i < pages.length; ++i) {
                  const codepage = pages[i]
                  const name = memoryreadcodepagename(codepage)
                  const lines = codepage.code.split('\n').slice(0, 2)
                  gadgethyperlink(
                    message.player,
                    'list',
                    `@${name}$ltgrey ${lines[1] ?? ''}`,
                    ['copyit', name],
                  )
                }
                const shared = gadgetstate(message.player)
                shared.scrollname = 'terrain list'
                shared.scroll = gadgetcheckqueue(message.player)
                break
                break
              }
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
                registercopy(
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
          case 'gadget':
            if (isarray(message.data)) {
              const [id, area] = message.data as [string, string]
              vmloader(vm, message.player, undefined, 'text', id, area)
            }
            break
          case 'findany':
            doasync(vm, message.player, async () => {
              await memoryfindany(path as keyof FINDANY_CONFIG, message.player)
            })
            break
          case 'makeit':
            memorymakeitcommand(path, message.data ?? '', message.player)
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
              memorymessagechip(message)
            } else {
              const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
              memorysendtoboards(
                invoke.target,
                invoke.path,
                undefined,
                memoryreadbookplayerboards(mainbook),
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
  platformready(vm)
}
