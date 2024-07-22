import { tape_info } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadbooklist,
  memoryreadbooksbytags,
  memoryreadcontext,
  memoryreadmaintags,
} from 'zss/memory'
import { boardwritestat } from 'zss/memory/board'
import { boardelementwritestat } from 'zss/memory/boardelement'
import {
  bookreadcodepagebyaddress,
  bookreadcodepagedatabytype,
  MAYBE_BOOK,
} from 'zss/memory/book'
import {
  CODE_PAGE_TYPE,
  codepagereaddata,
  codepagereadtype,
  codepagereadtypetostring,
} from 'zss/memory/codepage'

import { ARG_TYPE, readargs } from './wordtypes'

const MODS = {
  // current target for mods
  book: '',
  board: '',
  // elements
  object: '',
  terrain: '',
  // display
  charset: '',
  palette: '',
  // general cursor
  cursor: '',
}

type MODS_KEY = keyof typeof MODS

function strmodname(name: string): MODS_KEY | undefined {
  const lname = name.toLowerCase()
  switch (lname) {
    case 'modbook':
    case 'modboard':
    case 'modobject':
    case 'modterrain':
    case 'modcharset':
    case 'modpalette': {
      return lname.replace('mod', '') as MODS_KEY
    }
  }
  return undefined
}

function modbook(): MAYBE_BOOK {
  // modbook
  const [book] = memoryreadbooksbytags([MODS.book])
  if (ispresent(book)) {
    return book
  }

  // main
  const [maybebook] = memoryreadbooksbytags(memoryreadmaintags())
  if (ispresent(maybebook)) {
    return maybebook
  }

  // oops
  return undefined
}

function modsoftware(name: MODS_KEY, key: string, value: any) {
  const book = modbook()
  if (!ispresent(book)) {
    return
  }

  // book mods
  if (name === 'book') {
    switch (key) {
      case 'name':
        if (isstring(value)) {
          book.name = value
        }
        break
      default:
        return false
    }

    return tape_info('mods', `wrote ${value} to ${key} on book ${book.id}`)
  }

  const codepage = bookreadcodepagebyaddress(book, MODS[name])
  const type = codepagereadtypetostring(codepage)
  const id = codepage?.id ?? ''

  // codepage mods
  switch (codepagereadtype(codepage)) {
    case CODE_PAGE_TYPE.BOARD: {
      const board = codepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
      if (ispresent(board)) {
        switch (key) {
          default:
            boardwritestat(board, key, value)
            break
        }
      }
      break
    }
    case CODE_PAGE_TYPE.OBJECT: {
      const object = codepagereaddata<CODE_PAGE_TYPE.OBJECT>(codepage)
      if (ispresent(object)) {
        switch (key) {
          case 'char':
          case 'color':
          case 'bg':
            object[key] = value
            break
          case 'cycle':
            boardelementwritestat(object, 'cycle', value)
            break
          default:
            return false
        }
      }
      break
    }
    case CODE_PAGE_TYPE.TERRAIN: {
      const terrain = codepagereaddata<CODE_PAGE_TYPE.TERRAIN>(codepage)
      if (ispresent(terrain)) {
        switch (key) {
          case 'char':
          case 'color':
          case 'bg':
            terrain[key] = value
            break
          default:
            return false
        }
      }
      break
    }
    case CODE_PAGE_TYPE.CHARSET: {
      const charset = codepagereaddata<CODE_PAGE_TYPE.CHARSET>(codepage)
      if (ispresent(charset)) {
        //
      }
      break
    }
    case CODE_PAGE_TYPE.PALETTE: {
      const palette = codepagereaddata<CODE_PAGE_TYPE.PALETTE>(codepage)
      if (ispresent(palette)) {
        //
      }
      break
    }
    default:
      return false
  }
  return tape_info('mods', `wrote ${value} to ${key} on ${type} ${id}`)
}

export const MODS_FIRMWARE = createfirmware({
  get(_, name) {
    const mod = strmodname(name)
    if (ispresent(mod)) {
      return [true, MODS[mod]]
    }

    // list of items
    const book = modbook()
    switch (name) {
      case 'books':
        return [true, memoryreadbooklist()]
      case 'boards':
        return [true, bookreadcodepagedatabytype(book, CODE_PAGE_TYPE.BOARD)]
      case 'objects':
        return [true, bookreadcodepagedatabytype(book, CODE_PAGE_TYPE.OBJECT)]
      case 'terrains':
        return [true, bookreadcodepagedatabytype(book, CODE_PAGE_TYPE.TERRAIN)]
      case 'charsets':
        return [true, bookreadcodepagedatabytype(book, CODE_PAGE_TYPE.CHARSET)]
      case 'palettes':
        return [true, bookreadcodepagedatabytype(book, CODE_PAGE_TYPE.PALETTE)]
        break
    }

    return [false, undefined]
  },
  set(_, name, value) {
    const mod = strmodname(name)
    if (ispresent(mod)) {
      MODS[mod] = value
      return [tape_info('mods', `wrote ${value} to ${name}`), MODS[mod]]
    }
    return [false, undefined]
  },
  shouldtick() {},
  tick() {},
  tock() {},
}).command('mod', (chip, words) => {
  // mod thing key value
  const [name, maybekey, maybevalue] = readargs(
    memoryreadcontext(chip, words),
    0,
    [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ],
  )

  // change cursor
  let usekey: any = ''
  let usevalue: any = undefined
  const lname = name.toLowerCase()
  switch (lname) {
    case 'book':
      MODS.cursor = 'book'
      usekey = maybekey
      usevalue = maybevalue
      break
    case 'board':
      MODS.cursor = 'board'
      usekey = maybekey
      usevalue = maybevalue
      break
    case 'object':
      MODS.cursor = 'object'
      usekey = maybekey
      usevalue = maybevalue
      break
    case 'terrain':
      MODS.cursor = 'terrain'
      usekey = maybekey
      usevalue = maybevalue
      break
    case 'charset':
      MODS.cursor = 'charset'
      usekey = maybekey
      usevalue = maybevalue
      break
    case 'palette':
      MODS.cursor = 'palette'
      usekey = maybekey
      usevalue = maybevalue
      break
    default:
      // use current value of MODS.cursor
      usekey = name
      usevalue = maybekey
      break
  }

  if (MODS.cursor) {
    tape_info(
      'mods',
      `selected ${MODS.cursor} - ${usekey ?? ''} ${usevalue ?? ''}`,
    )
  }

  // read cursor and write value
  if (MODS.cursor && isstring(usekey) && ispresent(usevalue)) {
    modsoftware(MODS.cursor as MODS_KEY, usekey, usevalue)
  }

  return 0
})
