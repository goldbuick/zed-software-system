import { createfirmware } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadbookbyaddress,
  memoryreadbooksbytags,
  memoryreadcontext,
  memoryreadmaintags,
} from 'zss/memory'
import { MAYBE_BOARD_ELEMENT } from 'zss/memory/boardelement'
import { bookreadcodepagebyaddress, MAYBE_BOOK } from 'zss/memory/book'
import { CODE_PAGE_TYPE, codepagereaddata } from 'zss/memory/codepage'

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
  const book = memoryreadbookbyaddress(MODS.book)
  if (ispresent(book)) {
    return book
  }
  const [maybebook] = memoryreadbooksbytags(memoryreadmaintags())
  if (ispresent(maybebook)) {
    return maybebook
  }
  return undefined
}

function modobject(): MAYBE_BOARD_ELEMENT {
  const codepage = bookreadcodepagebyaddress(modbook(), MODS.object)
  if (ispresent(codepage)) {
    return codepagereaddata<CODE_PAGE_TYPE.OBJECT>(codepage)
  }
}

function modterrain(): MAYBE_BOARD_ELEMENT {
  const codepage = bookreadcodepagebyaddress(modbook(), MODS.terrain)
  if (ispresent(codepage)) {
    return codepagereaddata<CODE_PAGE_TYPE.TERRAIN>(codepage)
  }
}

function modsoftware(name: MODS_KEY, key: string, value: any) {
  if (name === 'book') {
    const target = modbook()
    if (ispresent(target)) {
      //
    }

    return
  }

  let target: any = undefined
  let valid: string[] = []

  switch (name) {
    case 'book':
      target = modbook()
      valid = ['name']
      break
    case 'board':
      valid = ['name']

      break
    case 'object':
      target = modobject()
      valid = ['name']
      valid = ['char']
      valid = ['color']
      valid = ['bg']
      break
    case 'terrain':
      target = modterrain()
      valid = ['name']
      valid = ['char']
      valid = ['color']
      valid = ['bg']
      break
    case 'charset':
      valid = ['name']
      break
    case 'palette':
      valid = ['name']
      break
  }

  // update target
  if (ispresent(target) && valid.includes(key)) {
    target[key] = value
  }
}

export const MODS_FIRMWARE = createfirmware({
  get(chip, name) {
    const mod = strmodname(name)
    if (ispresent(mod)) {
      return [true, MODS[mod]]
    }
    return [false, undefined]
  },
  set(chip, name, value) {
    const mod = strmodname(name)
    if (ispresent(mod)) {
      MODS[mod] = value
      return [true, MODS[mod]]
    }
    return [false, undefined]
  },
  shouldtick(chip) {
    //
  },
  tick(chip) {
    //
  },
  tock(chip) {
    //
  },
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

  // read cursor and write value
  if (MODS.cursor && isstring(usekey) && ispresent(usevalue)) {
    modsoftware(MODS.cursor as MODS_KEY, usekey, usevalue)
  }

  return 0
})
