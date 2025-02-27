import { pick, pickwith } from 'zss/mapping/array'
import { clamp, randominteger, randomintegerwith } from 'zss/mapping/number'
import { isarray, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { memoryrun } from 'zss/memory'
import {
  findplayerforelement,
  listelementsbykind,
  listnamedelements,
} from 'zss/memory/atomics'
import { bookboardcheckmoveobject } from 'zss/memory/book'

import { isstrcategory, mapstrcategory, readcategory } from './category'
import { isstrcollision, mapstrcollision, readcollision } from './collision'
import { isstrcolor, mapstrcolor, readcolor } from './color'
import { isstrdir, mapstrdir, readdir } from './dir'
import { readstrkindname } from './kind'
import { ARG_TYPE, READ_CONTEXT, readargs } from './reader'
import { NAME } from './types'

export function readexpr(index: number): [any, number] {
  const maybevalue = READ_CONTEXT.words[index]
  const ii = index + 1

  // check consts
  if (mapstrcategory(maybevalue)) {
    const [maybecategory, n1] = readcategory(index)
    if (ispresent(maybecategory)) {
      return [maybecategory, n1]
    }
  }

  if (mapstrcollision(maybevalue)) {
    const [maybecollision, n2] = readcollision(index)
    if (ispresent(maybecollision)) {
      return [maybecollision, n2]
    }
  }

  if (mapstrcolor(maybevalue)) {
    const [maybecolor, n3] = readcolor(index)
    if (ispresent(maybecolor)) {
      return [maybecolor, n3]
    }
  }

  // special case rnd expression
  if (isstring(maybevalue) && NAME(maybevalue) === 'rnd') {
    // RND - returns 0 or 1
    // RND <number> - return 0 to number
    // RND <number> <number> - return number to number
    const [min, iii] = readexpr(ii)
    const [max, iiii] = readexpr(iii)
    if (isnumber(min) && isnumber(max)) {
      return [randominteger(min, max), iiii]
    }
    if (isnumber(min)) {
      return [randominteger(0, min), iii]
    }
    return [randominteger(0, 1), ii]
  }

  if (mapstrdir(maybevalue)) {
    const [maybedir, iii] = readdir(index)
    if (ispresent(maybedir)) {
      return [maybedir, iii]
    }
  }

  // check complex values

  // empty is invalid
  if (!ispresent(maybevalue)) {
    return [undefined, index]
  }

  // check for pt, number, or array
  if (isnumber(maybevalue) || isarray(maybevalue)) {
    return [maybevalue, ii]
  }

  // check for flags and expressions
  if (isstring(maybevalue)) {
    const maybeexpr = NAME(maybevalue)

    // check for flag
    const maybeflagfromvalue = READ_CONTEXT.get?.(maybevalue)
    if (ispresent(maybeflagfromvalue)) {
      return [maybeflagfromvalue, ii]
    }

    // check for expressions
    switch (maybeexpr) {
      // zzt
      case 'aligned':
      case 'alligned': {
        // ALLIGNED
        // This flag is SET whenever the object is aligned with the player either horizontally or vertically.
        const maybeplayer = findplayerforelement(
          READ_CONTEXT.board,
          READ_CONTEXT.element,
          READ_CONTEXT.elementfocus,
        )
        if (!ispresent(READ_CONTEXT.element) || !ispresent(maybeplayer)) {
          return [0, ii]
        }
        return [
          READ_CONTEXT.element.x === maybeplayer.x ||
          READ_CONTEXT.element.y === maybeplayer.y
            ? 1
            : 0,
          ii,
        ]
      }
      case 'contact': {
        // CONTACT
        // This flag is SET whenever the object is adjacent to (touching) the player.
        const maybeplayer = findplayerforelement(
          READ_CONTEXT.board,
          READ_CONTEXT.element,
          READ_CONTEXT.elementfocus,
        )
        if (!ispresent(READ_CONTEXT.element) || !ispresent(maybeplayer)) {
          return [0, ii]
        }
        const dx = (maybeplayer.x ?? 0) - (READ_CONTEXT.element?.x ?? 0)
        const dy = (maybeplayer.y ?? 0) - (READ_CONTEXT.element?.y ?? 0)
        const iscontact =
          (dx === 0 && Math.abs(dy) < 2) || (dy === 0 && Math.abs(dx) < 2)
            ? 1
            : 0
        return [iscontact, ii]
      }
      case 'blocked': {
        // BLOCKED <direction>
        // This flag is SET when the object is not free to move in the given direction, and
        // CLEAR when the object is free to move in the direction.
        const [dir, iii] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.DIR])
        const isblocked = bookboardcheckmoveobject(
          READ_CONTEXT.book,
          READ_CONTEXT.board,
          READ_CONTEXT.element,
          dir,
        )
        return [isblocked ? 1 : 0, iii]
      }
      case 'any': {
        // ANY <color> <item>
        // This flag is SET whenever the given kind is visible on the board
        const [target, iii] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.KIND])
        // begin filtering
        const targetname = readstrkindname(target) ?? ''
        const boardelements = listnamedelements(READ_CONTEXT.board, targetname)
        const targetelements = listelementsbykind(boardelements, target)
        return [targetelements.length ? 1 : 0, iii]
      }
      // zss
      // numbers
      case 'rnd': {
        return [randominteger(0, 1), ii]
      }
      case 'abs': {
        // ABS <a>
        const [a, iii] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.NUMBER])
        return [Math.abs(a), iii]
      }
      case 'ceil': {
        // CEIL <a>
        const [a, iii] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.NUMBER])
        return [Math.ceil(a), iii]
      }
      case 'floor': {
        // FLOOR <a>
        const [a, iii] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.NUMBER])
        return [Math.floor(a), iii]
      }
      case 'round': {
        // ROUND <a>
        const [a, iii] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.NUMBER])
        return [Math.round(a), iii]
      }
      case 'clamp': {
        // CLAMP <a> <min> <max>
        const [a, min, max, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
        ])
        return [clamp(a, min, max), iii]
      }
      // array
      case 'min': {
        // MIN <a> [b] [c] [d]
        const values: any[] = []
        for (let iii = ii; iii < READ_CONTEXT.words.length; ) {
          const [value, iiii] = readexpr(iii)
          // if we're given array, we use values from it
          if (
            isarray(value) &&
            !isstrdir(value) &&
            !isstrcategory(value) &&
            !isstrcollision(value) &&
            !isstrcolor(value)
          ) {
            values.push(...value)
          }
          iii = iiii
          values.push(value)
        }
        return [Math.min(...values), READ_CONTEXT.words.length]
      }
      case 'max': {
        // MAX <a> [b] [c] [d]
        const values: any[] = []
        for (let iii = ii; iii < READ_CONTEXT.words.length; ) {
          const [value, iiii] = readexpr(iii)
          // if we're given array, we use values from it
          if (
            isarray(value) &&
            !isstrdir(value) &&
            !isstrcategory(value) &&
            !isstrcollision(value) &&
            !isstrcolor(value)
          ) {
            values.push(...value)
          }
          iii = iiii
          values.push(value)
        }
        return [Math.max(...values), READ_CONTEXT.words.length]
      }
      case 'pick': {
        // PICK <a> [b] [c] [d]
        const values: any[] = []
        for (let iii = ii; iii < READ_CONTEXT.words.length; ) {
          const [value, iiii] = readexpr(iii)
          // if we're given array, we use values from it
          if (
            isarray(value) &&
            !isstrdir(value) &&
            !isstrcategory(value) &&
            !isstrcollision(value) &&
            !isstrcolor(value)
          ) {
            values.push(...value)
          }
          iii = iiii
          values.push(value)
        }
        return [pick(values), READ_CONTEXT.words.length]
      }
      case 'pickwith': {
        // PICKWITH <seed> <a> [b] [c] [d]
        const values: any[] = []
        const [seed, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.NUMBER_OR_STRING,
        ])
        for (let iiii = iii; iiii < READ_CONTEXT.words.length; ) {
          const [value, iiiii] = readexpr(iiii)
          // if we're given array, we use values from it
          if (
            isarray(value) &&
            !isstrdir(value) &&
            !isstrcategory(value) &&
            !isstrcollision(value) &&
            !isstrcolor(value)
          ) {
            values.push(...value)
          }
          iiii = iiiii
          values.push(value)
        }
        return [pickwith(`${seed}`, values), READ_CONTEXT.words.length]
      }
      case 'random': {
        // RANDOM <a> [b]
        const [a, b, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.NUMBER,
          ARG_TYPE.MAYBE_NUMBER,
        ])
        return [randominteger(a, b ?? 0), iii]
      }
      case 'randomwith': {
        // RANDOMWITH <seed> <a> [b]
        const [seed, a, b, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.NUMBER_OR_STRING,
          ARG_TYPE.NUMBER,
          ARG_TYPE.MAYBE_NUMBER,
        ])
        return [randomintegerwith(`${seed}`, a, b ?? 0), iii]
      }
      // advanced
      case 'run': {
        const [func, iii] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.NAME])
        memoryrun(func)
        return [READ_CONTEXT.get?.('arg'), iii]
      }
      case 'runwith': {
        const [arg, func, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.ANY,
          ARG_TYPE.NAME,
        ])
        if (ispresent(READ_CONTEXT.element)) {
          READ_CONTEXT.element.arg = arg
        }
        memoryrun(func)
        return [READ_CONTEXT.get?.('arg'), iii]
      }
    }
  }

  // pass through everything else
  return [maybevalue, ii]
}
