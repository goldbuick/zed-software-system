import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { MAYBE, isnumber, isstring } from 'zss/mapping/types'

export const INPUT_FLAG_NAMES = new Set([
  'inputmove',
  'inputshoot',
  'inputalt',
  'inputctrl',
  'inputshift',
  'inputok',
  'inputcancel',
  'inputmenu',
  'inputa',
  'inputb',
  'inputx',
  'inputy',
  'inputl1',
  'inputl2',
  'inputr1',
  'inputr2',
])

const readinputmap = ['NORTH', 'SOUTH', 'WEST', 'EAST']

export function ismoveinput(input: INPUT): boolean {
  return (
    input === INPUT.MOVE_UP ||
    input === INPUT.MOVE_DOWN ||
    input === INPUT.MOVE_LEFT ||
    input === INPUT.MOVE_RIGHT
  )
}

export function isshootinput(input: INPUT): boolean {
  return (
    input === INPUT.SHOOT_UP ||
    input === INPUT.SHOOT_DOWN ||
    input === INPUT.SHOOT_LEFT ||
    input === INPUT.SHOOT_RIGHT
  )
}

export function remapfpvdir(
  inputdir: string,
  graphics: MAYBE<string>,
  facing: MAYBE<number>,
): string {
  if (!(isstring(graphics) && graphics === 'fpv' && isnumber(facing))) {
    return inputdir
  }
  const mappedfacing = Math.round(facing / 90)
  switch (mappedfacing) {
    default:
    case 0:
      return inputdir
    case 1:
      switch (inputdir) {
        default:
        case 'NORTH':
          return 'EAST'
        case 'EAST':
          return 'SOUTH'
        case 'SOUTH':
          return 'WEST'
        case 'WEST':
          return 'NORTH'
      }
    case 2:
      switch (inputdir) {
        default:
        case 'NORTH':
          return 'SOUTH'
        case 'EAST':
          return 'WEST'
        case 'SOUTH':
          return 'NORTH'
        case 'WEST':
          return 'EAST'
      }
    case 3:
      switch (inputdir) {
        default:
        case 'NORTH':
          return 'WEST'
        case 'EAST':
          return 'NORTH'
        case 'SOUTH':
          return 'EAST'
        case 'WEST':
          return 'SOUTH'
      }
  }
}

export function dirfrommoveorshoot(input: INPUT): string {
  if (ismoveinput(input)) {
    return readinputmap[input - INPUT.MOVE_UP]
  }
  return readinputmap[input - INPUT.SHOOT_UP]
}

/** Append dir; drop the opposing cardinal if present (keeps diagonals). */
export function pushdir(list: string[], dir: string): string[] {
  const next = list.filter((d) => {
    if (dir === 'NORTH' && d === 'SOUTH') {
      return false
    }
    if (dir === 'SOUTH' && d === 'NORTH') {
      return false
    }
    if (dir === 'WEST' && d === 'EAST') {
      return false
    }
    if (dir === 'EAST' && d === 'WEST') {
      return false
    }
    return true
  })
  if (!next.includes(dir)) {
    return [...next, dir]
  }
  return next
}

export type PLAYER_INPUT_FLAGS = {
  inputcurrent: number
  inputqueue: [INPUT, number][]
  inputmove: string[]
  inputshoot: string[]
  inputok: number
  inputcancel: number
  inputmenu: number
  inputa: number
  inputb: number
  inputx: number
  inputy: number
  inputl1: number
  inputl2: number
  inputr1: number
  inputr2: number
  inputalt: number
  inputctrl: number
  inputshift: number
  [key: string]: unknown
}

/**
 * Drain MOVE and SHOOT dirs (and one action) from the queue into player input flags.
 */
export function applyinputqueue(
  flags: PLAYER_INPUT_FLAGS,
  graphics: MAYBE<string>,
  facing: MAYBE<number>,
): PLAYER_INPUT_FLAGS {
  if (!isnumber(flags.inputcurrent)) {
    flags.inputcurrent = 0
  }
  if (!Array.isArray(flags.inputqueue)) {
    flags.inputqueue = []
  }

  if (flags.inputcurrent > 0) {
    return flags
  }

  const queue = flags.inputqueue

  flags.inputmove = []
  flags.inputshoot = []
  flags.inputok = 0
  flags.inputcancel = 0
  flags.inputmenu = 0
  flags.inputa = 0
  flags.inputb = 0
  flags.inputx = 0
  flags.inputy = 0
  flags.inputl1 = 0
  flags.inputl2 = 0
  flags.inputr1 = 0
  flags.inputr2 = 0
  flags.inputalt = 0
  flags.inputctrl = 0
  flags.inputshift = 0

  let inputmove: string[] = []
  let inputshoot: string[] = []
  let actioninput: INPUT = INPUT.NONE
  let actionmods = 0
  const consumed = new Set<INPUT>()

  for (let i = 0; i < queue.length; ++i) {
    const [input, mods] = queue[i]
    if (input === INPUT.NONE) {
      continue
    }
    if (ismoveinput(input)) {
      const dir = remapfpvdir(dirfrommoveorshoot(input), graphics, facing)
      inputmove = pushdir(inputmove, dir)
      consumed.add(input)
      if (mods & INPUT_ALT) {
        flags.inputalt = 1
      }
      if (mods & INPUT_CTRL) {
        flags.inputctrl = 1
      }
      // also update inputshoot when SHIFT is held down
      if (mods & INPUT_SHIFT) {
        flags.inputshift = 1
        inputshoot = pushdir(inputmove, dir)
      }
      continue
    }
    if (isshootinput(input)) {
      const dir = remapfpvdir(dirfrommoveorshoot(input), graphics, facing)
      inputshoot = pushdir(inputshoot, dir)
      consumed.add(input)
      if (mods & INPUT_ALT) {
        flags.inputalt = 1
      }
      if (mods & INPUT_CTRL) {
        flags.inputctrl = 1
      }
      // inputmove + inputshift
      flags.inputshift = 1
      inputmove = inputshoot
      continue
    }
    if (actioninput === INPUT.NONE) {
      actioninput = input
      actionmods = mods
      consumed.add(input)
    }
  }

  flags.inputmove = inputmove
  flags.inputshoot = inputshoot

  if (actionmods & INPUT_ALT) {
    flags.inputalt = 1
  }
  if (actionmods & INPUT_CTRL) {
    flags.inputctrl = 1
  }
  if (actionmods & INPUT_SHIFT) {
    flags.inputshift = 1
  }

  switch (actioninput) {
    case INPUT.OK_BUTTON:
      flags.inputok = 1
      break
    case INPUT.CANCEL_BUTTON:
      flags.inputcancel = 1
      break
    case INPUT.MENU_BUTTON:
      flags.inputmenu = 1
      break
    case INPUT.BUTTON_A:
      flags.inputa = 1
      break
    case INPUT.BUTTON_B:
      flags.inputb = 1
      break
    case INPUT.BUTTON_X:
      flags.inputx = 1
      break
    case INPUT.BUTTON_Y:
      flags.inputy = 1
      break
    case INPUT.BUTTON_L1:
      flags.inputl1 = 1
      break
    case INPUT.BUTTON_L2:
      flags.inputl2 = 1
      break
    case INPUT.BUTTON_R1:
      flags.inputr1 = 1
      break
    case INPUT.BUTTON_R2:
      flags.inputr2 = 1
      break
    case INPUT.ALT:
      flags.inputalt = 1
      break
    case INPUT.CTRL:
      flags.inputctrl = 1
      break
    case INPUT.SHIFT:
      flags.inputshift = 1
      break
    default:
      break
  }

  if (actioninput !== INPUT.NONE) {
    flags.inputcurrent = actioninput
  } else {
    flags.inputcurrent = INPUT.NONE
    for (let i = 0; i < queue.length; ++i) {
      const [input] = queue[i]
      if (consumed.has(input) && (ismoveinput(input) || isshootinput(input))) {
        flags.inputcurrent = input
        break
      }
    }
  }

  flags.inputqueue = queue.filter((item) => {
    const [check] = item
    return check !== INPUT.NONE && !consumed.has(check)
  })

  return flags
}
