import { apierror } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import { boardcopy } from 'zss/feature/boardcopy'
import { createsid } from 'zss/mapping/guid'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardaccess'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryensuresoftwarecodepage } from 'zss/memory/books'
import { memoryreadcodepagedata } from 'zss/memory/codepageoperations'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { memoryreadflags } from 'zss/memory/flags'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { NAME } from 'zss/words/types'

const COPY_P1 = { x: 0, y: 0 }
const COPY_P2 = { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 }
const COPY_TARGETSET = 'all'

const STANDARD_ELEMENT_STAT_NAMES = new Set([
  'char',
  'color',
  'bg',
  'displaychar',
  'displaycolor',
  'displaybg',
  'displayname',
  'item',
  'group',
  'party',
  'player',
  'pushable',
  'collision',
  'breakable',
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
  'didfail',
  'light',
  'lightdir',
  'arg',
])

function isstandardelementstat(stat: string) {
  return STANDARD_ELEMENT_STAT_NAMES.has(NAME(stat))
}

function isexitstat(stat: string) {
  switch (NAME(stat)) {
    case 'exitnorth':
    case 'exitsouth':
    case 'exitwest':
    case 'exiteast':
      return true
    default:
      return false
  }
}

function applyexitlinks(stat: string, current: BOARD, created: BOARD) {
  switch (NAME(stat)) {
    case 'exitwest':
      created.exiteast = current.id
      current.exitwest = created.id
      break
    case 'exiteast':
      created.exitwest = current.id
      current.exiteast = created.id
      break
    case 'exitnorth':
      created.exitsouth = current.id
      current.exitnorth = created.id
      break
    case 'exitsouth':
      created.exitnorth = current.id
      current.exitsouth = created.id
      break
    default:
      break
  }
}

function copyboardstats(created: BOARD, source: BOARD) {
  created.isdark = source.isdark
  created.startx = source.startx
  created.starty = source.starty
  created.over = source.over
  created.under = source.under
  created.camera = source.camera
  created.graphics = source.graphics
  created.facing = source.facing
  created.charset = source.charset
  created.palette = source.palette
  created.timelimit = source.timelimit
  created.restartonzap = source.restartonzap
  created.maxplayershots = source.maxplayershots
  created.b1 = source.b1
  created.b2 = source.b2
  created.b3 = source.b3
  created.b4 = source.b4
  created.b5 = source.b5
  created.b6 = source.b6
  created.b7 = source.b7
  created.b8 = source.b8
  created.b9 = source.b9
  created.b10 = source.b10
}

function writebuildstat(
  device: DEVICELIKE,
  player: string,
  currentboard: BOARD,
  elementid: string,
  stat: string,
  createdboard: BOARD,
): boolean {
  if (isexitstat(stat)) {
    applyexitlinks(stat, currentboard, createdboard)
    return true
  }

  if (isstandardelementstat(stat)) {
    const element = memoryreadobject(currentboard, elementid)
    if (!ispresent(element)) {
      apierror(device, player, 'build', `build: element not found ${elementid}`)
      return false
    }
    element[NAME(stat) as keyof BOARD_ELEMENT] = createdboard.id as never
    return true
  }

  const flags = memoryreadflags(player)
  flags[stat] = createdboard.id
  return true
}

export function boardbuild(
  device: DEVICELIKE,
  player: string,
  boardid: string,
  elementid: string,
  stat: string,
  maybesource?: string,
): void {
  const currentboard = memoryreadboardbyaddress(boardid)
  if (!ispresent(currentboard)) {
    apierror(device, player, 'build', `build: board not found ${boardid}`)
    return
  }

  if (
    !isexitstat(stat) &&
    isstandardelementstat(stat) &&
    !ispresent(memoryreadobject(currentboard, elementid))
  ) {
    apierror(device, player, 'build', `build: element not found ${elementid}`)
    return
  }

  let sourceboard: BOARD | undefined
  if (isstring(maybesource) && maybesource.length > 0) {
    const sourcepage = memorypickcodepagewithtypeandstat(
      CODE_PAGE_TYPE.BOARD,
      maybesource,
    )
    if (!ispresent(sourcepage)) {
      apierror(device, player, 'build', `build: board not found ${maybesource}`)
      return
    }
    sourceboard = memoryreadboardbyaddress(maybesource)
    if (!ispresent(sourceboard)) {
      apierror(device, player, 'build', `build: board not found ${maybesource}`)
      return
    }
  }

  const [codepage] = memoryensuresoftwarecodepage(
    MEMORY_LABEL.TEMP,
    createsid(),
    CODE_PAGE_TYPE.BOARD,
  )
  if (!ispresent(codepage)) {
    apierror(device, player, 'build', 'build: failed to create board')
    return
  }

  const createdboard = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(codepage)
  if (!ispresent(createdboard)) {
    apierror(device, player, 'build', 'build: failed to create board')
    return
  }

  if (ispresent(sourceboard)) {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const prevbook = READ_CONTEXT.book
    READ_CONTEXT.book = mainbook
    const copied = boardcopy(
      sourceboard.id,
      createdboard.id,
      COPY_P1,
      COPY_P2,
      COPY_TARGETSET,
    )
    READ_CONTEXT.book = prevbook
    if (!copied) {
      apierror(device, player, 'build', `build: copy failed ${maybesource}`)
      return
    }
    copyboardstats(createdboard, sourceboard)
  }

  if (
    !writebuildstat(device, player, currentboard, elementid, stat, createdboard)
  ) {
    return
  }
}
