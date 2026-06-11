import { objectKeys } from 'ts-extras'
import { parsetarget } from 'zss/device'
import {
  apierror,
  registercopy,
  registereditoropen,
  vmclearscroll,
  vmcodeaddress,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import {
  DIVIDER,
  zsstexttape,
  zsszedlinkline,
  zsszedlinklinechip,
} from 'zss/feature/zsstextui'
import { codepagepicksuffix } from 'zss/firmware/cli/utils'
import {
  registerhyperlinksharedbridge,
  registerhyperlinksharedcleanup,
  resolvehyperlinksharedbridge,
} from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { indextopt, ptstoarea, rectpoints } from 'zss/mapping/2d'
import { range } from 'zss/mapping/array'
import { doasync } from 'zss/mapping/func'
import { CYCLE_DEFAULT, waitfor } from 'zss/mapping/tick'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { maptonumber, maptostring } from 'zss/mapping/value'
import { ispt } from 'zss/words/dir'
import { CATEGORY, COLLISION, PT, WORD } from 'zss/words/types'

import {
  memoryboardelementindex,
  memoryreadelement,
  memoryreadelementbyidorindex,
  memoryreadobject,
} from './boardaccess'
import { memoryboardelementisobject } from './boardelement'
import { memorysafedeleteelement, memorywriteterrain } from './boardlifecycle'
import {
  memoryinitboard,
  memoryreadboardbyaddress,
  memoryreadelementstat,
} from './boards'
import {
  memoryreadelementcodepage,
  memoryreadelementdisplay,
} from './bookoperations'
import { memoryensuresoftwarebook } from './books'
import {
  memoryreadcodepagename,
  memoryreadcodepagestatdefaults,
  memoryreadcodepagetypeasstring,
} from './codepageoperations'
import { memorypickcodepagewithtypeandstat } from './codepages'
import { memoryhassecretheap } from './inspectionbatch'
import { memoryloadermatches } from './loader'
import { memoryreadplayerboard } from './playermanagement'
import {
  memorycodepagetoprefix,
  memoryelementtodisplayprefix,
} from './rendering'
import {
  memoryensureboardruntime,
  memoryreadboardelementruntime,
} from './runtimeboundary'
import { memoryreadbookbysoftware, memoryreadoperator } from './session'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_WIDTH,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from './types'

function chipfromelement(board: MAYBE<BOARD>, element: MAYBE<BOARD_ELEMENT>) {
  const id = element?.id ?? memoryboardelementindex(board, element)
  return `inspect:${id}`
}

function memoryinspectjoinlinkwords(words: WORD[]): string {
  return words
    .map((w) => {
      if (isarray(w)) {
        return memoryinspectjoinlinkwords(w as unknown as WORD[])
      }
      const s = `${w ?? ''}`
      if (/\s/.test(s) || s.length === 0) {
        return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
      }
      return s
    })
    .join(' ')
}

export function memoryinspectboardlines(board: string): string[] {
  const boardcodepage = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.BOARD,
    board,
  )
  const boardname = memoryreadcodepagename(boardcodepage)
  return [
    zsszedlinklinechip(
      'batch',
      `pageopen:${board}`,
      `edit $blue[board] $white${boardname}`,
    ),
    zsszedlinklinechip(
      'batch',
      `istargetless copyit ${board}`,
      `board id ${board}`,
    ),
  ]
}

export function memoryinspectloaderlines(p1: PT, p2: PT): string[] {
  const loaders = memoryloadermatches('text', 'gadget:action')
  if (!loaders.length) {
    return []
  }
  const area = ptstoarea(p1, p2)
  const lines = []
  for (let i = 0; i < loaders.length; ++i) {
    const codepage = loaders[i]
    const name = memoryreadcodepagename(codepage)
    lines.push(
      zsszedlinklinechip(
        'gadget',
        `action "" ${codepage.id} ${area}`,
        `run ${name}`,
      ),
    )
  }
  return lines
}

const elementhyperlinktypes = [
  'rn',
  'range',
  'sl',
  'select',
  'nm',
  'number',
  'tx',
  'text',
  'zssedit',
  'charedit',
  'coloredit',
  'bgedit',
]

type ELEMENT_HYPERLINK_CONTEXT = {
  board: string
  elementbyid?: string
  elementbyindex?: number
  elementsbypoints?: PT[]
}

const elementhyperlinkcontext: ELEMENT_HYPERLINK_CONTEXT = {
  board: '',
}

function registerhyperlinksforelementgetvalue(typ: string, name: string) {
  const maybeboard = memoryreadboardbyaddress(elementhyperlinkcontext.board)
  let element: MAYBE<BOARD_ELEMENT>
  if (elementhyperlinkcontext.elementbyid) {
    element = memoryreadobject(maybeboard, elementhyperlinkcontext.elementbyid)
  } else if (isnumber(elementhyperlinkcontext.elementbyindex)) {
    const pt = indextopt(elementhyperlinkcontext.elementbyindex, BOARD_WIDTH)
    element = memoryreadelement(maybeboard, pt)
  } else if (isarray(elementhyperlinkcontext.elementsbypoints)) {
    const [first] = elementhyperlinkcontext.elementsbypoints
    if (ispt(first)) {
      element = memoryreadelement(maybeboard, first)
    }
  }
  // get falls back to kind data
  const kind = memoryreadboardelementruntime(element)?.kinddata
  const maybevalue =
    element?.[name as keyof BOARD_ELEMENT] ??
    kind?.[name as keyof BOARD_ELEMENT]
  switch (typ) {
    case 'rn':
    case 'range':
    case 'sl':
    case 'select':
    case 'nm':
    case 'number':
    case 'bgedit':
    case 'charedit':
    case 'coloredit':
      switch (name) {
        case 'group':
          return isstring(maybevalue)
            ? parseInt(maybevalue.replace('group', ''))
            : 0
        case 'cycle':
          return maptonumber(maybevalue, CYCLE_DEFAULT)
        case 'collision':
          return maptonumber(maybevalue, COLLISION.ISWALK)
        case 'p1':
        case 'p2':
        case 'p3':
        case 'p4':
        case 'p5':
        case 'p6':
        case 'p7':
        case 'p8':
        case 'p9':
        case 'p10':
        case 'item':
        case 'pushable':
        case 'breakable':
        default:
          // update to return stat default value
          return maptonumber(maybevalue, 0)
      }
    case 'tx':
    case 'text':
    case 'zssedit':
      return maptostring(maybevalue)
  }
  return 0
}

function registerhyperlinksforelementsetvalue(
  typ: string,
  name: string,
  value: WORD,
) {
  const maybeboard = memoryreadboardbyaddress(elementhyperlinkcontext.board)
  const elements: MAYBE<BOARD_ELEMENT>[] = []
  if (elementhyperlinkcontext.elementbyid) {
    elements.push(
      memoryreadobject(maybeboard, elementhyperlinkcontext.elementbyid),
    )
  } else if (isnumber(elementhyperlinkcontext.elementbyindex)) {
    const pt = indextopt(elementhyperlinkcontext.elementbyindex, BOARD_WIDTH)
    elements.push(memoryreadelement(maybeboard, pt))
  } else if (isarray(elementhyperlinkcontext.elementsbypoints)) {
    for (const pt of elementhyperlinkcontext.elementsbypoints) {
      if (ispt(pt)) {
        elements.push(memoryreadelement(maybeboard, pt))
      }
    }
  }
  switch (name) {
    case 'group':
      if (isnumber(value)) {
        for (const element of elements) {
          if (ispresent(element)) {
            element.group = `group${value}`
          }
        }
      }
      break
    default:
      switch (typ) {
        case 'rn':
        case 'range':
        case 'sl':
        case 'select':
        case 'nm':
        case 'number':
        case 'bgedit':
        case 'charedit':
        case 'coloredit': {
          const withvalue = maptonumber(value, 0)
          for (const element of elements) {
            if (ispresent(element)) {
              element[name as keyof BOARD_ELEMENT] = withvalue
            }
          }
          const editedboard = memoryreadboardbyaddress(
            elementhyperlinkcontext.board,
          )
          if (ispresent(editedboard)) {
            memoryensureboardruntime(editedboard).drawneedfull = true
          }
          break
        }
        case 'tx':
        case 'text':
        case 'zssedit': {
          const withvalue = maptostring(value)
          for (const element of elements) {
            if (ispresent(element)) {
              element[name as keyof BOARD_ELEMENT] = withvalue
            }
          }
          break
        }
      }
      break
  }
}

function registerhyperlinksforelement(
  chip: string,
  context: ELEMENT_HYPERLINK_CONTEXT,
) {
  const keep = Object.keys(context)
  const validate = Object.keys(elementhyperlinkcontext)
  // copy new context
  Object.assign(elementhyperlinkcontext, context)
  // remove unused keys
  for (const key of validate) {
    if (!keep.includes(key)) {
      delete elementhyperlinkcontext[key as keyof ELEMENT_HYPERLINK_CONTEXT]
    }
  }
  // remove any shared bridges that are no longer needed
  registerhyperlinksharedcleanup()
  // register new shared bridges
  for (const type of elementhyperlinktypes) {
    const shared = resolvehyperlinksharedbridge(chip, type)
    if (ispresent(shared)) {
      continue
    }
    registerhyperlinksharedbridge(
      chip,
      type,
      registerhyperlinksforelementgetvalue,
      registerhyperlinksforelementsetvalue,
    )
  }
}

export async function memoryinspect(player: string, p1: PT, p2: PT) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  const showpaste = await memoryhassecretheap()
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  // ensure lookup
  memoryinitboard(board)

  // one element, or many ?
  if (p1.x === p2.x && p1.y === p2.y) {
    const element = memoryreadelement(board, p1, true)
    const codepage = memoryreadelementcodepage(mainbook, element)
    // found element def
    if (ispresent(element) && ispresent(codepage)) {
      memoryinspectelement(
        player,
        board,
        codepage,
        element,
        p1,
        memoryboardelementisobject(element),
      )
      return
    }
    if (!element?.kind) {
      const emptylines = [
        `empty: ${p1.x}, ${p1.y}`,
        DIVIDER,
        zsszedlinklinechip(
          'empty',
          `copycoords:${p1.x},${p1.y} hk 5 " 5 "`,
          'copy coords',
        ),
        ...memoryinspectloaderlines(p1, p2),
        ...memoryinspectboardlines(board.id),
      ]
      scrollwritelines(player, 'inspect', zsstexttape(emptylines), 'refscroll')
      return
    }
  } else {
    memoryinspectarea(player, p1, p2, showpaste)
    return
  }
}

export function memoryinspectarea(
  player: string,
  p1: PT,
  p2: PT,
  memoryhassecretheap: boolean,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  const area = ptstoarea(p1, p2)
  const groupchip = `groups:${area}`
  registerhyperlinksforelement(groupchip, {
    board: board.id,
    elementsbypoints: rectpoints(p1.x, p1.y, p2.x, p2.y),
  })

  const grouptokens = [
    'group',
    'select',
    'none',
    '0',
    ...range(1, 127)
      .map((i) => [`group${i}`, `${i}`])
      .flat(),
  ]
  const groupline = zsszedlinkline(grouptokens.join(' '), 'group')

  const lines: string[] = [
    `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    DIVIDER,
    zsszedlinklinechip(
      'batch',
      `copy:${area} hk 1 " 1 " next`,
      'copy elements',
    ),
    zsszedlinklinechip('batch', `cut:${area} hk 2 " 2 " next`, 'cut elements'),
  ]
  if (memoryhassecretheap) {
    lines.push(
      zsszedlinklinechip(
        'batch',
        `paste:${area} hk 3 " 3 " next`,
        'paste elements',
      ),
    )
  }
  lines.push(
    zsszedlinklinechip('batch', `copycoords:${area} hk 5 " 5 "`, 'copy coords'),
  )
  if (memoryhassecretheap) {
    lines.push(
      zsszedlinklinechip(
        'batch',
        `style:${area} hk s " S " next`,
        'style transfer',
      ),
    )
  }
  lines.push(
    zsszedlinklinechip(
      'remix',
      `remix:${area} hk r " R " next`,
      'remix coords',
    ),
    DIVIDER,
    zsszedlinklinechip('batch', `chars:${area} hk a " A " next`, 'set chars:'),
    zsszedlinklinechip(
      'batch',
      `colors:${area} hk c " C " next`,
      'set colors:',
    ),
    zsszedlinklinechip('batch', `bgs:${area} hk b " B " next`, 'set bgs:'),
    zsszedlinklinechip('batch', `empty:${area} hk 0 " 0 " next`, 'make empty'),
    DIVIDER,
    groupline,
    ...memoryinspectloaderlines(p1, p2),
  )

  const x1 = Math.min(p1.x, p2.x)
  const y1 = Math.min(p1.y, p2.y)
  const x2 = Math.max(p1.x, p2.x)
  const y2 = Math.max(p1.y, p2.y)
  const ids = new Set<string>()
  for (let y = y1; y <= y2; ++y) {
    for (let x = x1; x <= x2; ++x) {
      const element = memoryreadelement(board, { x, y })
      const codepage = memoryreadelementcodepage(mainbook, element)
      if (ispresent(codepage) && !ids.has(codepage.id)) {
        ids.add(codepage.id)
        const name = memoryreadcodepagename(codepage)
        const type = memoryreadcodepagetypeasstring(codepage)
        const prefix = memorycodepagetoprefix(codepage)
        lines.push(
          zsszedlinklinechip(
            'batch',
            `pageopen:${codepage.id}`,
            `edit $blue[${type}] ${prefix}$white${name}${codepagepicksuffix(codepage)}`,
          ),
        )
      }
    }
  }

  lines.push(...memoryinspectboardlines(board.id))

  scrollwritelines(player, 'inspect', zsstexttape(lines), groupchip)
}

export function memoryinspectbgarea(
  player: string,
  p1: PT,
  p2: PT,
  name: string,
) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  const batchchip = `batch:${ptstoarea(p1, p2)}`
  registerhyperlinksforelement(batchchip, {
    board: board.id,
    elementsbypoints: rectpoints(p1.x, p1.y, p2.x, p2.y),
  })

  const lines = [
    `batch chars: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    DIVIDER,
    zsszedlinkline(`${name} bgedit`, 'bg'),
  ]
  scrollwritelines(player, 'bulk set bg', zsstexttape(lines), batchchip)
}

export function memoryinspectchar(
  player: string,
  element: BOARD_ELEMENT,
  name: string,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  const chip = chipfromelement(board, element)
  registerhyperlinksforelement(chip, {
    board: board.id,
    elementbyid: element.id,
    elementbyindex: memoryboardelementindex(board, element),
  })

  const strcategory =
    memoryreadboardelementruntime(element)?.category === CATEGORY.ISTERRAIN
      ? 'terrain'
      : 'object'
  const strname = element.name ?? element.kind ?? 'ERR'
  const strpos = `${element.x ?? -1}, ${element.y ?? -1}`

  const lines = [
    `${strcategory}: ${strname} ${strpos}`,
    DIVIDER,
    zsszedlinkline(`${name} charedit`, 'char'),
  ]
  scrollwritelines(player, 'char', zsstexttape(lines), chip)
}

export function memoryinspectchararea(
  player: string,
  p1: PT,
  p2: PT,
  name: string,
) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  const batchchip = `batch:${ptstoarea(p1, p2)}`
  registerhyperlinksforelement(batchchip, {
    board: board.id,
    elementsbypoints: rectpoints(p1.x, p1.y, p2.x, p2.y),
  })

  const lines = [
    `batch chars: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    DIVIDER,
    zsszedlinkline(`${name} charedit`, 'char'),
  ]
  scrollwritelines(player, 'bulk set char', zsstexttape(lines), batchchip)
}

export function memoryinspectcolor(
  player: string,
  element: BOARD_ELEMENT,
  name: string,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  const chip = chipfromelement(board, element)
  registerhyperlinksforelement(chip, {
    board: board.id,
    elementbyid: element.id,
    elementbyindex: memoryboardelementindex(board, element),
  })

  const strcategory =
    memoryreadboardelementruntime(element)?.category === CATEGORY.ISTERRAIN
      ? 'terrain'
      : 'object'
  const strname = element.name ?? element.kind ?? 'ERR'
  const strpos = `${element.x ?? -1}, ${element.y ?? -1}`
  const edittype = name === 'bg' ? 'bgedit' : 'coloredit'

  const lines = [
    `${strcategory}: ${strname} ${strpos}`,
    DIVIDER,
    zsszedlinkline(`${name} ${edittype}`, 'color'),
  ]
  scrollwritelines(player, name, zsstexttape(lines), chip)
}

export function memoryinspectcolorarea(
  player: string,
  p1: PT,
  p2: PT,
  name: string,
) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  const batchchip = `batch:${ptstoarea(p1, p2)}`
  registerhyperlinksforelement(batchchip, {
    board: board.id,
    elementsbypoints: rectpoints(p1.x, p1.y, p2.x, p2.y),
  })

  const lines = [
    `batch chars: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    DIVIDER,
    zsszedlinkline(`${name} coloredit`, 'color'),
  ]
  scrollwritelines(player, 'bulk set color', zsstexttape(lines), batchchip)
}

export function memoryinspectcommand(path: string, player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }
  const inspect = parsetarget(path)
  const element = memoryreadelementbyidorindex(board, inspect.target)
  if (!ispresent(element)) {
    return
  }
  switch (inspect.path) {
    case 'copycoords':
      registercopy(SOFTWARE, player, [element.x ?? 0, element.y ?? 0].join(' '))
      break
    case 'bg':
    case 'color':
      memoryinspectcolor(player, element, inspect.path)
      break
    case 'char':
      memoryinspectchar(player, element, inspect.path)
      break
    case 'empty':
      memorysafedeleteelement(board, element, mainbook.timestamp)
      break
    case 'code':
      doasync(SOFTWARE, player, async () => {
        const pagetype = 'object'

        // edit path
        const path = [board.id, element.id]

        // write to modem
        modemwriteinitstring(
          vmcodeaddress(mainbook.id, path),
          element.code ?? '',
        )

        // close scroll
        vmclearscroll(SOFTWARE, player)

        // wait a little
        await waitfor(800)

        // open code editor
        const prefix = memoryelementtodisplayprefix(element)
        const title = `${prefix}$ONCLEAR$GREEN ${element.name ?? element.kind ?? '??'} - ${mainbook.name}`
        registereditoropen(SOFTWARE, player, mainbook.id, path, pagetype, title)
      })
      break
    default:
      apierror(
        SOFTWARE,
        memoryreadoperator(),
        'inspect',
        'unknown inspect',
        inspect,
      )
      break
  }
}

export function memoryinspectelement(
  player: string,
  board: BOARD,
  codepage: CODE_PAGE,
  element: BOARD_ELEMENT,
  p1: PT,
  isobject: boolean,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const chip = chipfromelement(board, element)
  registerhyperlinksforelement(chip, {
    board: board.id,
    elementbyid: element.id,
    elementbyindex: memoryboardelementindex(board, element),
  })

  const stats = memoryreadcodepagestatdefaults(codepage)
  const targets = objectKeys(stats)

  const lines: string[] = []
  if (isobject) {
    lines.push(
      `object: ${element.name ?? element.kind ?? 'ERR'} ${p1.x}, ${p1.y} $white${element.id ?? ''}`,
    )
  } else {
    lines.push(`terrain: ${element.kind ?? 'ERR'} ${p1.x}, ${p1.y}`)
  }
  if (isobject) {
    lines.push(`cycle: ${memoryreadelementstat(element, 'cycle')}`)
  }

  const collision = memoryreadelementstat(element, 'collision')
  switch (collision as COLLISION) {
    case COLLISION.ISWALK:
      lines.push(`collision: iswalk`)
      break
    case COLLISION.ISSWIM:
      lines.push(`collision: isswim`)
      break
    case COLLISION.ISSOLID:
      lines.push(`collision: issolid`)
      break
    case COLLISION.ISBULLET:
      lines.push(`collision: isbullet`)
      break
    case COLLISION.ISGHOST:
      lines.push(`collision: isghost`)
      break
  }

  if (isobject) {
    lines.push(
      `ispushable: ${memoryreadelementstat(element, 'pushable') ? `yes` : `no`}`,
    )
  }
  lines.push(
    `isbreakable: ${
      memoryreadelementstat(element, 'breakable') ? `yes` : `no`
    }`,
  )

  lines.push(DIVIDER)

  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]
    switch (target) {
      case 'char':
      case 'cycle':
      case 'color':
      case 'bg':
      case 'group':
      case 'collision':
      case 'pushable':
      case 'breakable':
        break
      default:
        if (isarray(stats[target])) {
          const [type, label, ...args] = stats[target]
          if (isstring(label)) {
            const linklabel = label || target
            const words: WORD[] = [target, type, ...args]
            lines.push(
              zsszedlinkline(memoryinspectjoinlinkwords(words), linklabel),
            )
          }
        }
        break
    }
  }

  lines.push(
    zsszedlinkline(
      memoryinspectjoinlinkwords(['copycoords', 'hk', '5', ' 5 ']),
      'copy coords',
    ),
  )
  lines.push(DIVIDER)
  lines.push(
    zsszedlinkline(
      memoryinspectjoinlinkwords(['char', 'hk', 'a', ' A ', 'next']),
      `char: ${
        element.char ??
        memoryreadboardelementruntime(element)?.kinddata?.char ??
        1
      }`,
    ),
  )
  lines.push(
    zsszedlinkline(
      memoryinspectjoinlinkwords(['color', 'hk', 'c', ' C ', 'next']),
      `color: ${
        element.color ??
        memoryreadboardelementruntime(element)?.kinddata?.color ??
        15
      }`,
    ),
  )
  lines.push(
    zsszedlinkline(
      memoryinspectjoinlinkwords(['bg', 'hk', 'b', ' B ', 'next']),
      `bg: ${element.bg ?? memoryreadboardelementruntime(element)?.kinddata?.bg ?? 0}`,
    ),
  )
  lines.push(
    zsszedlinkline(
      memoryinspectjoinlinkwords(['empty', 'hk', '0']),
      'make empty',
    ),
  )
  lines.push(DIVIDER)

  const grouptokens = [
    'group',
    'select',
    'none',
    '0',
    ...range(1, 127)
      .map((i) => [`group${i}`, `${i}`])
      .flat(),
  ]
  lines.push(zsszedlinkline(grouptokens.join(' '), 'group'))
  lines.push(...memoryinspectloaderlines(p1, p1))
  if (ispresent(codepage)) {
    const name = memoryreadcodepagename(codepage)
    const type = memoryreadcodepagetypeasstring(codepage)
    const prefix = memorycodepagetoprefix(codepage)
    lines.push(
      zsszedlinklinechip(
        'batch',
        `pageopen:${codepage.id}`,
        `edit $blue[${type}] ${prefix}$white${name}${codepagepicksuffix(codepage)}`,
      ),
    )
  }
  lines.push(...memoryinspectboardlines(board.id))

  scrollwritelines(player, 'inspect', zsstexttape(lines), chip)
}

export function memoryinspectempty(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  switch (mode) {
    case 'emptyall': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = memoryreadelement(board, { x, y })
          if (
            memoryreadboardelementruntime(maybeobject)?.category ===
            CATEGORY.ISOBJECT
          ) {
            memorysafedeleteelement(board, maybeobject, mainbook.timestamp)
          }
          memorywriteterrain(board, { x, y })
        }
      }
      break
    }
    case 'emptyobjects': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = memoryreadelement(board, { x, y }, true)
          if (
            memoryreadboardelementruntime(maybeobject)?.category ===
            CATEGORY.ISOBJECT
          ) {
            memorysafedeleteelement(board, maybeobject, mainbook.timestamp)
          }
        }
      }
      break
    }
    case 'emptyterrain': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          memorywriteterrain(board, { x, y })
        }
      }
      break
    }
  }
}

export function memoryinspectemptymenu(player: string, p1: PT, p2: PT) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  const area = ptstoarea(p1, p2)
  const lines = [
    `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    DIVIDER,
    zsszedlinklinechip(
      'batch',
      `emptyall:${area} hk 1 " 1 "`,
      'clear terrain & objects',
    ),
    zsszedlinklinechip(
      'batch',
      `emptyobjects:${area} hk 2 " 2 "`,
      'clear objects',
    ),
    zsszedlinklinechip(
      'batch',
      `emptyterrain:${area} hk 3 " 3 "`,
      'clear terrain',
    ),
  ]
  scrollwritelines(player, 'empty', zsstexttape(lines), 'batch')
}
