import { pick, range } from 'zss/mapping/array'
import { clamp, randominteger } from 'zss/mapping/number'
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
import { ispt, isstrdir, mapstrdir, readdir } from './dir'
import { readstrkindname } from './kind'
import { ARG_TYPE, READ_CONTEXT, readargs } from './reader'
import { NAME } from './types'

export function readexpr(index: number, stringeval = true): [any, number] {
  const maybevalue = READ_CONTEXT.words[index]

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
    const [min, ii] = readexpr(index + 1)
    const [max, iii] = readexpr(ii)
    if (isnumber(min) && isnumber(max)) {
      return [randominteger(min, max), iii]
    }
    if (isnumber(min)) {
      return [randominteger(0, min), ii]
    }
    return [randominteger(0, 1), index + 1]
  }

  if (mapstrdir(maybevalue)) {
    const [maybedir, n4] = readdir(index)
    if (ispresent(maybedir)) {
      return [maybedir, n4]
    }
  }

  // check complex values

  // empty is invalid
  if (!ispresent(maybevalue)) {
    return [undefined, index]
  }

  // check for pt, number, or array
  if (ispt(maybevalue) || isnumber(maybevalue) || isarray(maybevalue)) {
    return [maybevalue, index + 1]
  }

  // check for flags and expressions
  if (isstring(maybevalue)) {
    const maybeexpr = NAME(maybevalue)

    // check for flag
    if (stringeval) {
      const maybeflagfromvalue = READ_CONTEXT.get?.(maybevalue)
      if (ispresent(maybeflagfromvalue)) {
        return [maybeflagfromvalue, index + 1]
      }
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
          READ_CONTEXT.player,
        )
        if (!ispresent(READ_CONTEXT.element) || !ispresent(maybeplayer)) {
          return [0, index + 1]
        }
        return [
          READ_CONTEXT.element.x === maybeplayer.x ||
          READ_CONTEXT.element.y === maybeplayer.y
            ? 1
            : 0,
          index + 1,
        ]
      }
      case 'contact': {
        // CONTACT
        // This flag is SET whenever the object is adjacent to (touching) the player.
        const maybeplayer = findplayerforelement(
          READ_CONTEXT.board,
          READ_CONTEXT.element,
          READ_CONTEXT.player,
        )
        if (!ispresent(READ_CONTEXT.element) || !ispresent(maybeplayer)) {
          return [0, index + 1]
        }
        const dx = (maybeplayer.x ?? 0) - (READ_CONTEXT.element?.x ?? 0)
        const dy = (maybeplayer.y ?? 0) - (READ_CONTEXT.element?.y ?? 0)
        return [
          (dx === 0 && Math.abs(dy) < 2) || (dy === 0 && Math.abs(dx) < 2)
            ? 1
            : 0,
          index + 1,
        ]
      }
      case 'blocked': {
        // BLOCKED <direction>
        // This flag is SET when the object is not free to move in the given direction, and
        // CLEAR when the object is free to move in the direction.
        const [dir, ii] = readargs(READ_CONTEXT.words, index + 1, [
          ARG_TYPE.DIR,
        ])
        return [
          bookboardcheckmoveobject(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            READ_CONTEXT.element,
            dir,
          )
            ? 1
            : 0,
          ii,
        ]
      }
      case 'any': {
        // ANY <color> <item>
        // This flag is SET whenever the given kind is visible on the board
        const [target, ii] = readargs(READ_CONTEXT.words, index + 1, [
          ARG_TYPE.KIND,
        ])
        // begin filtering
        const targetname = readstrkindname(target) ?? ''
        const boardelements = listnamedelements(READ_CONTEXT.board, targetname)
        const targetelements = listelementsbykind(boardelements, target)
        return [targetelements.length ? 1 : 0, ii]
      }
      // zss
      // numbers
      case 'rnd': {
        return [randominteger(0, 1), index + 1]
      }
      case 'abs': {
        // ABS <a>
        const [a, ii] = readargs(READ_CONTEXT.words, index + 1, [
          ARG_TYPE.NUMBER,
        ])
        return [Math.abs(a), ii]
      }
      case 'ceil': {
        // CEIL <a>
        const [a, ii] = readargs(READ_CONTEXT.words, index + 1, [
          ARG_TYPE.NUMBER,
        ])
        return [Math.ceil(a), ii]
      }
      case 'floor': {
        // FLOOR <a>
        const [a, ii] = readargs(READ_CONTEXT.words, index + 1, [
          ARG_TYPE.NUMBER,
        ])
        return [Math.floor(a), ii]
      }
      case 'round': {
        // ROUND <a>
        const [a, ii] = readargs(READ_CONTEXT.words, index + 1, [
          ARG_TYPE.NUMBER,
        ])
        return [Math.round(a), ii]
      }
      // array
      case 'min': {
        // MIN <a> [b] [c] [d]
        const values: any[] = []
        for (let ii = index + 1; ii < READ_CONTEXT.words.length; ) {
          const [value, iii] = readexpr(ii)
          // if we're given array, we pick from it
          if (
            isarray(value) &&
            !ispt(value) &&
            !isstrdir(value) &&
            !isstrcategory(value) &&
            !isstrcollision(value) &&
            !isstrcolor(value)
          ) {
            return [pick(value), iii]
          }
          ii = iii
          values.push(value)
        }
        return [Math.min(...values), READ_CONTEXT.words.length]
      }
      case 'max': {
        // MAX <a> [b] [c] [d]
        const values: any[] = []
        for (let ii = index + 1; ii < READ_CONTEXT.words.length; ) {
          const [value, iii] = readexpr(ii)
          // if we're given array, we pick from it
          if (
            isarray(value) &&
            !ispt(value) &&
            !isstrdir(value) &&
            !isstrcategory(value) &&
            !isstrcollision(value) &&
            !isstrcolor(value)
          ) {
            return [pick(value), iii]
          }
          ii = iii
          values.push(value)
        }
        return [Math.max(...values), READ_CONTEXT.words.length]
      }
      case 'clamp': {
        // CLAMP <a> <min> <max>
        const [a, min, max, ii] = readargs(READ_CONTEXT.words, index + 1, [
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
        ])
        return [clamp(a, min, max), ii]
      }
      case 'pick': {
        // PICK <a> [b] [c] [d]
        const values: any[] = []
        for (let ii = index + 1; ii < READ_CONTEXT.words.length; ) {
          const [value, iii] = readexpr(ii)
          // if we're given array, we pick from it
          if (
            isarray(value) &&
            !ispt(value) &&
            !isstrdir(value) &&
            !isstrcategory(value) &&
            !isstrcollision(value) &&
            !isstrcolor(value)
          ) {
            return [pick(value), iii]
          }
          ii = iii
          values.push(value)
        }
        return [pick(values), READ_CONTEXT.words.length]
      }
      case 'range': {
        // RANGE <a> [b] [step]
        const [a, b, step, ii] = readargs(READ_CONTEXT.words, index + 1, [
          ARG_TYPE.NUMBER,
          ARG_TYPE.MAYBE_NUMBER,
          ARG_TYPE.MAYBE_NUMBER,
        ])
        return [range(a, b, step), ii]
      }
      // advanced
      case 'run': {
        const [func, ii] = readargs(READ_CONTEXT.words, index + 1, [
          ARG_TYPE.STRING,
        ])
        memoryrun(func)
        return [READ_CONTEXT.get?.('arg'), ii]
      }
      case 'runwith': {
        const [arg, func, ii] = readargs(READ_CONTEXT.words, index + 1, [
          ARG_TYPE.ANY,
          ARG_TYPE.STRING,
        ])
        if (ispresent(READ_CONTEXT.element)) {
          READ_CONTEXT.element.arg = arg
        }
        memoryrun(func)
        return [READ_CONTEXT.get?.('arg'), ii]
      }
    }
  }

  // pass through everything else
  return [maybevalue, index + 1]
}
