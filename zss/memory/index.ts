import { CHIP } from 'zss/chip'
import { api_error, tape_debug, tape_info } from 'zss/device/api'
import { DRIVER_TYPE } from 'zss/firmware/boot'
import { WORD, createreadcontext } from 'zss/firmware/wordtypes'
import { BITMAP } from 'zss/gadget/data/bitmap'
import {
  COLOR,
  INPUT,
  LAYER,
  createdither,
  createlayercontrol,
  createsprite,
  createsprites,
  createtiles,
} from 'zss/gadget/data/types'
import { average } from 'zss/mapping/array'
import { createpid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { CYCLE_DEFAULT } from 'zss/mapping/tick'
import {
  MAYBE,
  MAYBE_STRING,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { OS } from 'zss/os'

import {
  boarddeleteobject,
  BOARD,
  MAYBE_BOARD,
  boardelementname,
  boardobjectcreatefromkind,
} from './board'
import { MAYBE_BOARD_ELEMENT, boardelementreadstat } from './boardelement'
import {
  BOOK,
  MAYBE_BOOK,
  bookboardtick,
  bookelementkindread,
  bookhasmatch,
  bookplayerreadboard,
  bookplayerreadboards,
  bookplayersetboard,
  bookreadboardsbytags,
  bookreadcodepagesbytype,
  bookreadobjectsbytags,
} from './book'
import { CODE_PAGE_TYPE, codepagereadstats } from './codepage'
import { EIGHT_TRACK } from './eighttrack'
import {
  FRAME_STATE,
  FRAME_TYPE,
  createeditframe,
  createviewframe,
} from './frame'
import {
  mimetypeofbytesread,
  parsebinaryfile,
  parsetextfile,
  parsezipfile,
} from './parsefile'

type BINARY_READER = {
  filename: string
  offset: number
  bytes: Uint8Array
  dataview: DataView
}

type CHIP_TARGETS = {
  // memory
  book: MAYBE_BOOK
  // codepages
  board: MAYBE_BOARD
  object: MAYBE_BOARD_ELEMENT
  terrain: MAYBE_BOARD_ELEMENT
  charset: MAYBE<BITMAP>
  palette: MAYBE<BITMAP>
  eighttrack: MAYBE<EIGHT_TRACK>
  // loaders
  binaryfile: MAYBE<BINARY_READER>
}

type CHIP_PLAYER_INPUT = {
  player: string
  inputmods: Record<INPUT, number>
  inputqueue: Set<INPUT>
  inputcurrent: MAYBE<INPUT>
}

type CHIP_MEMORY = CHIP_TARGETS & CHIP_PLAYER_INPUT

export enum MEMORY_LABEL {
  MAIN = 'main',
  TITLE = 'title',
  PLAYER = 'player',
}

const MEMORY = {
  // running software
  defaultplayer: createpid(),
  books: new Map<string, BOOK>(),
  chips: new Map<string, CHIP_MEMORY>(),
  // active loaders
  loaders: new Map<string, string>(),
  // may re-work how this works
  // may be simpler to just to be able to have a board
  // show another board, and mods api etc..
  frames: new Map<string, FRAME_STATE[]>(),
  // tag configs
  tags: {
    main: new Set([MEMORY_LABEL.MAIN as string]),
    title: new Set([MEMORY_LABEL.TITLE as string]),
    player: new Set([MEMORY_LABEL.PLAYER as string]),
  },
}

export function memoryreadtags(label: string) {
  const index = label.toLowerCase() as keyof typeof MEMORY.tags
  return [...(MEMORY.tags[index] ?? [])]
}

export function memoryaddtags(label: string, tags: string[]) {
  const index = label.toLowerCase() as keyof typeof MEMORY.tags
  if (!ispresent(MEMORY.tags[index])) {
    MEMORY.tags[index] = new Set(tags)
  } else {
    const list = MEMORY.tags[index]
    tags.forEach((item) => list.add(item))
  }
}

export function memoryremovetags(label: string, tags: string[]) {
  const index = label.toLowerCase() as keyof typeof MEMORY.tags
  if (!ispresent(MEMORY.tags[index])) {
    // noop
  } else {
    const list = MEMORY.tags[index]
    tags.forEach((item) => list.delete(item))
  }
}

export function memoryreadmaintags() {
  return memoryreadtags(MEMORY_LABEL.MAIN)
}

export function memoryreadtitletags() {
  return memoryreadtags(MEMORY_LABEL.TITLE)
}

export function memoryreadplayertags() {
  return memoryreadtags(MEMORY_LABEL.PLAYER)
}

export function memorygetdefaultplayer() {
  return MEMORY.defaultplayer
}

export function memoryresetframes(board: string): FRAME_STATE[] {
  const frames: FRAME_STATE[] = [createviewframe([], [])]
  MEMORY.frames.set(board, frames)
  return frames
}

export function memorycreateviewframe(
  board: string,
  book: string[],
  view: string[],
) {
  const frames = memoryreadframes(board)
  if (ispresent(frames)) {
    frames.push(createviewframe(book, view))
  }
}

export function memorycreateeditframe(
  board: string,
  book: string[],
  edit: string[],
) {
  const frames = memoryreadframes(board)
  if (ispresent(frames)) {
    frames.push(createeditframe(book, edit))
  }
}

export function memoryreadframes(board: string) {
  return MEMORY.frames.get(board) ?? memoryresetframes(board)
}

export function memoryreadbooklist(): BOOK[] {
  return [...MEMORY.books.values()]
}

export function memoryreadbookbyaddress(address: string): MAYBE_BOOK {
  const laddress = address.toLowerCase()
  return (
    MEMORY.books.get(address) ??
    memoryreadbooklist().find((item) => item.name.toLowerCase() === laddress)
  )
}

export function memoryreadbooksbytags(tags: string[]) {
  const ltags = tags.map((tag) => tag.toLowerCase())
  return memoryreadbooklist().filter((book) => bookhasmatch(book, tags, ltags))
}

export function memoryresetbooks(books: BOOK[]) {
  MEMORY.books.clear()
  books.forEach((book) => {
    MEMORY.books.set(book.id, book)
  })
}

export function memorysetbook(book: BOOK) {
  MEMORY.books.set(book.id, book)
  return book.id
}

export function memoryclearbook(address: string) {
  const book = memoryreadbookbyaddress(address)
  if (book) {
    MEMORY.books.delete(book.id)
  }
}

export function memoryreadchip(id: string): CHIP_MEMORY {
  let chip = MEMORY.chips.get(id)

  if (!ispresent(chip)) {
    chip = {
      // targets
      book: undefined,
      board: undefined,
      object: undefined,
      terrain: undefined,
      charset: undefined,
      palette: undefined,
      eighttrack: undefined,
      // loaders
      binaryfile: undefined,
      // player input
      player: MEMORY.defaultplayer,
      inputqueue: new Set(),
      inputmods: {
        [INPUT.NONE]: 0,
        [INPUT.MOVE_UP]: 0,
        [INPUT.MOVE_DOWN]: 0,
        [INPUT.MOVE_LEFT]: 0,
        [INPUT.MOVE_RIGHT]: 0,
        [INPUT.OK_BUTTON]: 0,
        [INPUT.CANCEL_BUTTON]: 0,
        [INPUT.MENU_BUTTON]: 0,
      },
      inputcurrent: undefined,
    }
    MEMORY.chips.set(id, chip)
  }

  return chip
}

export function memoryreadcontext(chip: CHIP, words: WORD[]) {
  const memory = memoryreadchip(chip.id())
  return createreadcontext(memory, words, chip.get)
}

export function memoryplayerlogin(player: string): boolean {
  if (!isstring(player) || !player) {
    return api_error(
      'memory',
      'login',
      `failed for playerid ==>${player}<==`,
      player,
    )
  }

  const maintags = memoryreadmaintags()
  const [mainbook] = memoryreadbooksbytags(maintags)
  if (!ispresent(mainbook)) {
    return api_error(
      'memory',
      'login',
      `login failed to find book ${maintags.join('. ')}`,
      player,
    )
  }

  const titletags = memoryreadtitletags()
  const [titleboard] = bookreadboardsbytags(mainbook, titletags)
  if (!ispresent(titleboard)) {
    return api_error(
      'memory',
      'login',
      `login failed to find board ${titletags.join(', ')}`,
      player,
    )
  }

  const playertags = memoryreadplayertags()
  const [playerkind] = bookreadobjectsbytags(mainbook, playertags)
  if (!ispresent(playerkind)) {
    return api_error(
      'memory',
      'login',
      `login failed to find object type ${playertags.join(', ')}`,
      player,
    )
  }

  // TODO: what is a sensible way to place here ?
  // via player token I think ..

  const pt = { x: 0, y: 0 }
  const kindname = playerkind.name ?? MEMORY_LABEL.PLAYER
  const obj = boardobjectcreatefromkind(titleboard, pt, kindname, player)
  if (ispresent(obj?.id) && ispresent(titleboard.id)) {
    bookplayersetboard(mainbook, player, titleboard.id)
    return true
  }

  return false
}

export function memoryplayerlogout(player: string) {
  MEMORY.books.forEach((book) =>
    boarddeleteobject(bookplayerreadboard(book, player), player),
  )
}

export function memorytick(os: OS, timestamp: number) {
  // update loaders
  MEMORY.loaders.forEach((code, id) => {
    os.tick(id, DRIVER_TYPE.LOADER, 1, timestamp, 'loader', code)
    // teardown
    if (os.isended(id)) {
      os.halt(id)
      MEMORY.loaders.delete(id)
    }
  })

  const maintags = memoryreadmaintags()
  const [book] = memoryreadbooksbytags(maintags)
  const boards = bookplayerreadboards(book)

  // update boards / build code / run chips
  boards.forEach((board) => {
    const run = bookboardtick(book, board, timestamp)

    // iterate code needed to update given board
    for (let i = 0; i < run.length; ++i) {
      const item = run[i]

      // create / update context
      const context = memoryreadchip(item.id)
      context.book = book
      context.board = board
      context.object = item.object
      context.inputcurrent = undefined

      // map stats
      const maybekind = bookelementkindread(book, item.object)
      const maybekindcycle = boardelementreadstat(maybekind, 'cycle', undefined)
      const maybeplayer = boardelementreadstat(item.object, 'player', undefined)
      const maybecycle = boardelementreadstat(
        item.object,
        'cycle',
        maybekindcycle,
      )

      // update player from board element
      context.player = isstring(maybeplayer) ? maybeplayer : context.player

      // run chip code
      const itemname = boardelementname(item.object)
      os.tick(
        item.id,
        DRIVER_TYPE.OBJECT,
        isnumber(maybecycle) ? maybecycle : CYCLE_DEFAULT,
        timestamp,
        itemname,
        item.code,
      )
    }
  })
}

export function memorycli(
  os: OS,
  timestamp: number,
  player: string,
  cli: string,
) {
  // we try and execute cli invokes in main
  // its okay if we do not find main
  const [mainbook] = memoryreadbooksbytags(memoryreadmaintags())

  // player id + unique id fo run
  const id = `${player}_cli`

  // create / update context
  const context = memoryreadchip(id)

  context.player = player
  context.book = mainbook
  context.board = undefined
  context.inputcurrent = undefined

  tape_debug('memory', 'running', timestamp, id, cli)

  // run chip code
  os.once(id, DRIVER_TYPE.CLI, timestamp, 'cli', cli)
}

function memoryloader(
  timestamp: number,
  player: string,
  file: File,
  fileext: string,
  binaryfile: Uint8Array,
) {
  // we scan main book for loaders
  const [mainbook] = memoryreadbooksbytags(memoryreadmaintags())
  if (!ispresent(mainbook)) {
    return
  }

  const shouldmatch = ['binaryfile', fileext]
  tape_info('memory', 'looking for stats', ...shouldmatch)

  const loaders = bookreadcodepagesbytype(
    mainbook,
    CODE_PAGE_TYPE.LOADER,
  ).filter((codepage) => {
    // all blank stats must match
    const stats = codepagereadstats(codepage)
    const names = Object.keys(stats)
    const matched = names.filter(
      (name) => stats[name] === '' && shouldmatch.includes(name.toLowerCase()),
    )
    return matched.length === shouldmatch.length
  })

  for (let i = 0; i < loaders.length; ++i) {
    const loader = loaders[i]

    // player id + unique id fo run
    const id = `${player}_load_${loader.id}`

    // create / update context
    const context = memoryreadchip(id)

    context.player = player
    context.book = mainbook
    context.board = undefined
    context.binaryfile = {
      filename: file.name,
      offset: 0,
      bytes: binaryfile,
      dataview: new DataView(binaryfile.buffer),
    }
    context.inputcurrent = undefined

    tape_info('memory', 'starting loader', timestamp, id)

    // add code to active loaders
    MEMORY.loaders.set(id, loader.code)
  }
}

export function memoryloadfile(
  timestamp: number,
  player: string,
  file: File | undefined,
) {
  function handlefiletype(type: string) {
    if (!ispresent(file)) {
      return
    }
    switch (type) {
      case 'text/plain':
        parsetextfile(file).catch((err) =>
          api_error('memory', 'crash', err.message),
        )
        break
      case 'application/zip':
        parsezipfile(file, (zipfile) =>
          memoryloadfile(timestamp, player, zipfile),
        ).catch((err) => api_error('memory', 'crash', err.message))
        break
      case 'application/octet-stream':
        parsebinaryfile(file, (fileext, binaryfile) => {
          memoryloader(timestamp, player, file, fileext, binaryfile)
        }).catch((err) => api_error('memory', 'crash', err.message))
        break
      default:
        file
          .arrayBuffer()
          .then((arraybuffer) => {
            const type = mimetypeofbytesread(
              file.name,
              new Uint8Array(arraybuffer),
            )
            if (type) {
              handlefiletype(type)
            } else {
              return api_error(
                'memory',
                'loadfile',
                `unsupported file ${file.name}`,
              )
            }
          })
          .catch((err) => api_error('memory', 'crash', err.message))
        return
    }
  }
  handlefiletype(file?.type ?? '')
}

function memoryconverttogadgetlayers(
  player: string,
  index: number,
  book: BOOK,
  board: BOARD,
  isprimary: boolean,
  borrowbuffer: number[],
): LAYER[] {
  const layers: LAYER[] = []

  let i = index
  const isbaseboard = i === 0
  const boardwidth = board.width ?? 0
  const boardheight = board.height ?? 0
  const defaultcolor = isbaseboard ? COLOR.BLACK : COLOR.CLEAR

  const tiles = createtiles(player, i++, boardwidth, boardheight, defaultcolor)
  layers.push(tiles)

  const shadow = createdither(player, i++, boardwidth, boardheight)
  layers.push(shadow)

  const objectindex = i++
  const objects = createsprites(player, objectindex)
  layers.push(objects)

  const control = createlayercontrol(player, i++)
  // hack to keep only one control layer
  if (isprimary) {
    layers.push(control)
  }

  board.terrain.forEach((tile, i) => {
    if (tile) {
      const kind = bookelementkindread(book, tile)
      tiles.char[i] = tile.char ?? kind?.char ?? 0
      tiles.color[i] = tile.color ?? kind?.color ?? defaultcolor
      tiles.bg[i] = tile.bg ?? kind?.bg ?? defaultcolor
      // write to borrow buffer
      if (tiles.color[i] !== (COLOR.CLEAR as number)) {
        borrowbuffer[i] = tiles.color[i]
      }
    }
  })

  const boardobjects = board.objects ?? {}
  Object.values(boardobjects).forEach((object) => {
    // skip if marked for removal or headless
    if (ispresent(object.removed) || ispresent(object.headless)) {
      return
    }

    // should we have bg transparent or match the bg color of the terrain ?
    const id = object.id ?? ''
    const kind = bookelementkindread(book, object)
    const sprite = createsprite(player, objectindex, id)
    const lx = object.lx ?? object.x ?? 0
    const ly = object.ly ?? object.y ?? 0
    const li = lx + ly * board.width

    // setup sprite
    sprite.x = object.x ?? 0
    sprite.y = object.y ?? 0
    sprite.char = object.char ?? kind?.char ?? 1
    sprite.color = object.color ?? kind?.color ?? COLOR.WHITE
    sprite.bg = object.bg ?? kind?.bg ?? COLOR.BORROW
    objects.sprites.push(sprite)

    // plot shadow
    if (sprite.bg === COLOR.SHADOW) {
      sprite.bg = COLOR.CLEAR
      shadow.alphas[lx + ly * boardwidth] = 0.5
    }

    // borrow color
    if (sprite.bg === COLOR.BORROW) {
      sprite.bg = borrowbuffer[li] ?? COLOR.BLACK
    }

    // write to borrow buffer
    if (sprite.color !== (COLOR.CLEAR as number)) {
      borrowbuffer[li] = sprite.color
    }

    // inform control layer where to focus
    if (id === player) {
      control.focusx = sprite.x
      control.focusy = sprite.y
      control.focusid = id
    }
  })

  // smooth shadows
  function aa(x: number, y: number) {
    if (x < 0 || x >= board.width || y < 0 || y >= board.height) {
      return undefined
    }
    return shadow.alphas[x + y * board.width]
  }

  const weights = [
    [1, 1, 1, 1, 1],
    [1, 3, 5, 3, 1],
    [1, 5, 12, 5, 1],
    [1, 3, 5, 3, 1],
    [1, 1, 1, 1, 1],
  ].flat()

  const alphas = new Array<number>(shadow.alphas.length)
  for (let i = 0; i < shadow.alphas.length; ++i) {
    // coords
    const cx = i % board.width
    const cy = Math.floor(i / board.width)

    // weighted average
    const values = [
      [
        aa(cx - 2, cy - 2),
        aa(cx - 1, cy - 2),
        aa(cx, cy - 2),
        aa(cx + 1, cy - 2),
        aa(cx + 2, cy - 2),
      ],
      [
        aa(cx - 2, cy - 1),
        aa(cx - 1, cy - 1),
        aa(cx, cy - 1),
        aa(cx + 1, cy - 1),
        aa(cx + 2, cy - 1),
      ],
      [
        aa(cx - 2, cy),
        aa(cx - 1, cy),
        aa(cx, cy),
        aa(cx + 1, cy),
        aa(cx + 2, cy),
      ],
      [
        aa(cx - 2, cy + 1),
        aa(cx - 1, cy + 1),
        aa(cx, cy + 1),
        aa(cx + 1, cy + 1),
        aa(cx + 2, cy + 1),
      ],
      [
        aa(cx - 2, cy + 2),
        aa(cx - 1, cy + 2),
        aa(cx, cy + 2),
        aa(cx + 1, cy + 2),
        aa(cx + 2, cy + 2),
      ],
    ]
      .flat()
      .map((value, i) => (ispresent(value) ? value * weights[i] : undefined))
      .filter(ispresent)
    // final shade
    alphas[i] = clamp(average(values), 0, 1)
  }

  // update shadows
  shadow.alphas = alphas

  // return result
  return layers
}

function framerank(frame: FRAME_STATE): number {
  switch (frame.type) {
    case FRAME_TYPE.EDIT:
      return 1
    case FRAME_TYPE.VIEW:
      return 2
  }
  return 0
}

export function memoryreadgadgetlayers(player: string): LAYER[] {
  const [mainbook] = memoryreadbooksbytags(memoryreadmaintags())
  const board = bookplayerreadboard(mainbook, player)

  const layers: LAYER[] = []
  if (!ispresent(mainbook) || !ispresent(board)) {
    return layers
  }

  let i = 0
  const frames = [...memoryreadframes(board.id ?? '')]
  const borrowbuffer: number[] = new Array(board.width * board.height).fill(0)

  frames.sort((a, b) => framerank(a) - framerank(b))
  frames.forEach((frame) => {
    const [withbook] = memoryreadbooksbytags(frame.book ?? memoryreadmaintags())
    if (!ispresent(withbook)) {
      return
    }
    const [withboard] = bookreadboardsbytags(
      withbook,
      frame.board ?? memoryreadtitletags(),
    )
    if (!ispresent(withboard)) {
      return
    }
    const view = memoryconverttogadgetlayers(
      player,
      i,
      withbook,
      withboard,
      frame.type === FRAME_TYPE.VIEW,
      borrowbuffer,
    )
    i += view.length
    layers.push(...view)
  })

  return layers
}

export function memoryboardframeread(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  type: MAYBE_STRING,
) {
  // find target frame by type
  let maybeframe: MAYBE<FRAME_STATE>
  const frames = memoryreadframes(board?.id ?? '')
  switch (type) {
    // eventually need multiple frames of the same kinds
    // name:edit ??
    // so we'd have [name]:type, and name defaults to the value of
    // type of [name] is omitted
    case 'edit': {
      maybeframe = frames.find((item) => item.type === FRAME_TYPE.EDIT)
      break
    }
  }

  const [maybebook] = maybeframe
    ? memoryreadbooksbytags(maybeframe?.book ?? [])
    : [book]
  const [maybeboard] = maybeframe
    ? bookreadboardsbytags(maybebook, maybeframe?.board ?? [])
    : [board]

  return { maybebook, maybeboard }
}
