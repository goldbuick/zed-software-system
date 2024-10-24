/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { tape_info, vm_flush } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { BITMAP } from 'zss/gadget/data/bitmap'
import { createshortnameid } from 'zss/mapping/guid'
import {
  isarray,
  isboolean,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import {
  CHIP_MEMORY,
  memoryensuresoftwarebook,
  memoryreadchip,
  memoryreadcontext,
} from 'zss/memory'
import {
  bookreadcodepagebyaddress,
  bookreadcodepagewithtype,
  bookwritecodepage,
} from 'zss/memory/book'
import {
  codepagereadname,
  codepagereadtype,
  codepagereadtypetostring,
  codepagetypetostring,
  createcodepage,
} from 'zss/memory/codepage'
import {
  SCHEMA_TYPE,
  BITMAP_SCHEMA,
  BOARD_ELEMENT_SCHEMA,
  BOARD_SCHEMA,
  EIGHT_TRACK_SCHEMA,
} from 'zss/memory/schema'
import {
  BOARD,
  BOARD_ELEMENT,
  CODE_PAGE,
  CODE_PAGE_LABEL,
  CODE_PAGE_TYPE,
  EIGHT_TRACK,
} from 'zss/memory/types'

import { ARG_TYPE, readargs } from './wordtypes'

const COLOR_EDGE = '$dkpurple'

function write(text: string) {
  tape_info('mods', `${COLOR_EDGE}$blue${text}`)
}

type MOD_STATE = {
  target: string
} & (
  | {
      type: CODE_PAGE_TYPE.ERROR
      value: undefined
      schema: undefined
    }
  | {
      type: CODE_PAGE_TYPE.BOARD
      value: BOARD
      schema: typeof BOARD_SCHEMA
    }
  | {
      type: CODE_PAGE_TYPE.OBJECT
      value: BOARD_ELEMENT
      schema: typeof BOARD_ELEMENT_SCHEMA
    }
  | {
      type: CODE_PAGE_TYPE.TERRAIN
      value: BOARD_ELEMENT
      schema: typeof BOARD_ELEMENT_SCHEMA
    }
  | {
      type: CODE_PAGE_TYPE.CHARSET
      value: BITMAP
      schema: typeof BITMAP_SCHEMA
    }
  | {
      type: CODE_PAGE_TYPE.PALETTE
      value: BITMAP
      schema: typeof BITMAP_SCHEMA
    }
  | {
      type: CODE_PAGE_TYPE.EIGHT_TRACK
      value: EIGHT_TRACK
      schema: typeof EIGHT_TRACK_SCHEMA
    }
)

const mods = new Map<string, MOD_STATE>()

function readmodstate(id: string): MOD_STATE {
  let mod = mods.get(id)
  if (ispresent(mod)) {
    return mod
  }
  mod = {
    type: CODE_PAGE_TYPE.ERROR,
    target: '',
    value: undefined,
    schema: undefined,
  }
  mods.set(id, mod)
  return mod
}

function applymod(modstate: MOD_STATE, codepage: CODE_PAGE) {
  modstate.target = codepage.id
  switch (codepagereadtype(codepage)) {
    case CODE_PAGE_TYPE.ERROR:
    case CODE_PAGE_TYPE.LOADER:
      // no-ops
      break
    case CODE_PAGE_TYPE.BOARD:
      modstate.type = CODE_PAGE_TYPE.BOARD
      modstate.value = codepage.board
      modstate.schema = BOARD_SCHEMA
      break
    case CODE_PAGE_TYPE.OBJECT:
      modstate.type = CODE_PAGE_TYPE.OBJECT
      modstate.value = codepage.object
      modstate.schema = BOARD_ELEMENT_SCHEMA
      break
    case CODE_PAGE_TYPE.TERRAIN:
      modstate.type = CODE_PAGE_TYPE.TERRAIN
      modstate.value = codepage.terrain
      modstate.schema = BOARD_ELEMENT_SCHEMA
      break
    case CODE_PAGE_TYPE.CHARSET:
      modstate.type = CODE_PAGE_TYPE.CHARSET
      modstate.value = codepage.charset
      modstate.schema = BITMAP_SCHEMA
      break
    case CODE_PAGE_TYPE.PALETTE:
      modstate.type = CODE_PAGE_TYPE.PALETTE
      modstate.value = codepage.palette
      modstate.schema = BITMAP_SCHEMA
      break
    case CODE_PAGE_TYPE.EIGHT_TRACK:
      modstate.type = CODE_PAGE_TYPE.EIGHT_TRACK
      modstate.value = codepage.eighttrack
      modstate.schema = EIGHT_TRACK_SCHEMA
      break
  }
  // message
  const pagetype = codepagereadtypetostring(codepage)
  write(
    `modifying [${pagetype}] ${codepagereadname(codepage)} ${modstate.target}`,
  )
}

function ensurecodepage<T extends CODE_PAGE_TYPE>(
  modstate: MOD_STATE,
  memory: CHIP_MEMORY,
  type: T,
  address: string,
) {
  // lookup by address
  let codepage = bookreadcodepagewithtype(memory.book, type, address)
  if (ispresent(codepage)) {
    return codepage
  }

  // create new codepage
  const typestr = codepagetypetostring(type)
  codepage = createcodepage(
    typestr === 'object' ? `@${address}\n` : `@${typestr} ${address}\n`,
    {},
  )
  if (ispresent(codepage)) {
    bookwritecodepage(memory.book, codepage)
    applymod(modstate, codepage)
    vm_flush('mods') // tell register to save changes
  }

  return codepage
}

export const MODS_FIRMWARE = createfirmware({
  get() {
    return [false, undefined]
  },
  set() {
    return [false, undefined]
  },
  shouldtick() {},
  tick() {},
  tock() {},
})
  .command('mod', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const modstate = readmodstate(chip.id())

    const [type, maybename] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.MAYBE_STRING,
      ARG_TYPE.MAYBE_STRING,
    ])

    if (!ispresent(type)) {
      if (modstate.target === '') {
        write(`not currently modifying anything`)
      } else {
        const codepage = bookreadcodepagebyaddress(memory.book, modstate.target)
        const pagetype = codepagereadtypetostring(codepage)
        write(
          `modifying [${pagetype}] ${codepagereadname(codepage)} ${modstate.target}`,
        )
      }

      return 0
    }

    const maybeaddress = maybename ?? ''
    const maybetype = type.toLowerCase()

    // book is a special case
    if (maybetype === 'book') {
      // create new book
      memoryensuresoftwarebook('main', maybeaddress)
      // reset mod state
      modstate.type = CODE_PAGE_TYPE.ERROR
      modstate.target = ''
      modstate.value = undefined
      return 0
    }

    const withaddress = maybename ?? createshortnameid()
    switch (maybetype) {
      default: {
        // we check for name first, in current book
        const codepage = bookreadcodepagebyaddress(memory.book, type)
        if (ispresent(codepage)) {
          applymod(modstate, codepage)
        } else {
          const named = type || createshortnameid()
          ensurecodepage(modstate, memory, CODE_PAGE_TYPE.OBJECT, named)
        }
        break
      }
      case CODE_PAGE_LABEL.LOADER:
        ensurecodepage(modstate, memory, CODE_PAGE_TYPE.LOADER, withaddress)
        break
      case CODE_PAGE_LABEL.BOARD:
        ensurecodepage(modstate, memory, CODE_PAGE_TYPE.BOARD, withaddress)
        break
      case CODE_PAGE_LABEL.OBJECT:
        ensurecodepage(modstate, memory, CODE_PAGE_TYPE.OBJECT, withaddress)
        break
      case CODE_PAGE_LABEL.TERRAIN:
        ensurecodepage(modstate, memory, CODE_PAGE_TYPE.TERRAIN, withaddress)
        break
      case CODE_PAGE_LABEL.CHARSET:
        ensurecodepage(modstate, memory, CODE_PAGE_TYPE.CHARSET, withaddress)
        break
      case CODE_PAGE_LABEL.PALETTE:
        ensurecodepage(modstate, memory, CODE_PAGE_TYPE.PALETTE, withaddress)
        break
      case CODE_PAGE_LABEL.EIGHT_TRACK:
        ensurecodepage(
          modstate,
          memory,
          CODE_PAGE_TYPE.EIGHT_TRACK,
          withaddress,
        )
        break
    }

    return 0
  })
  .command('read', (chip, words) => {
    const modstate = readmodstate(chip.id())
    if (!ispresent(modstate.value)) {
      write(`use #mod before #read`)
      return 0
    }

    // write the value in given address into the given flag or print value to terminal
    // if we omit a stat name we print out a list of possible stats
    const [maybestat, maybeflag] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.MAYBE_STRING,
      ARG_TYPE.MAYBE_STRING,
    ])

    if (!ispresent(maybestat)) {
      // print all stat names
      if (
        modstate.schema?.type === SCHEMA_TYPE.OBJECT &&
        ispresent(modstate.schema.props)
      ) {
        const writenames: string[] = []
        const readonlynames: string[] = []
        const propnames = Object.keys(modstate.schema.props)
        for (let i = 0; i < propnames.length; ++i) {
          const name = propnames[i]
          switch (modstate.schema.props?.[name].type) {
            case SCHEMA_TYPE.SKIP:
              break
            case SCHEMA_TYPE.READ_ONLY:
              readonlynames.push(name)
              break
            default:
              writenames.push(name)
              break
          }
        }
        write(`write stats [${writenames.join(', ')}]`)
        write(`read only stats [${readonlynames.join(', ')}]`)
      }
      return 0
    }

    if (!ispresent(maybeflag)) {
      if (modstate.schema?.type === SCHEMA_TYPE.OBJECT) {
        const names = Object.keys(modstate.schema?.props ?? {})
        const stat = maybestat.toLowerCase()
        if (names.includes(stat)) {
          // print stat
          // @ts-expect-error being generic
          const value: any = modstate.value[stat]
          if (isstring(value) || isnumber(value) || isboolean(value)) {
            write(`stat ${stat} is ${value}`)
          }
          if (isarray(value)) {
            write(`stat ${stat} is an array`)
          }
          if (value === undefined) {
            write(`stat ${stat} is not set`)
          }
        }
      }
      return 0
    }

    // #mod shade1
    // #read
    return 0
  })
  .command('write', (chip, words) => {
    const modstate = readmodstate(chip.id())
    if (!ispresent(modstate.value)) {
      write(`use #mod before #write`)
      return 0
    }

    // write given value to given address
    const [name, value] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.ANY,
    ])

    if (modstate.schema?.type === SCHEMA_TYPE.OBJECT) {
      const prop = modstate.schema.props?.[name]
      if (ispresent(prop)) {
        switch (prop.type) {
          case SCHEMA_TYPE.NUMBER:
            modstate.value[name] = parseFloat(value)
            break
          case SCHEMA_TYPE.STRING:
            modstate.value[name] = `${value}`
            break
        }
      } else {
        // log error
      }
    }

    // we need to define a schema ..
    return 0
  })
