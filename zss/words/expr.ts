import { pick, range } from 'zss/mapping/array'
import { clamp, randomInteger } from 'zss/mapping/number'
import { isarray, isnumber, ispresent, isstring } from 'zss/mapping/types'

import { isstrcategory, mapstrcategory, readcategory } from './category'
import { isstrcollision, mapstrcollision, readcollision } from './collision'
import { isstrcolor, mapstrcolor, readcolor } from './color'
import { ispt, isstrdir, mapstrdir, readdir } from './dir'
import { ARG_TYPE, READ_CONTEXT, readargs } from './reader'

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
  if (isstring(maybevalue) && maybevalue.toLowerCase() === 'rnd') {
    // RND - returns 0 or 1
    // RND <number> - return 0 to number
    // RND <number> <number> - return number to number
    const [min, ii] = readexpr(index + 1)
    const [max, iii] = readexpr(ii)
    if (isnumber(min) && isnumber(max)) {
      return [randomInteger(min, max), iii]
    }
    if (isnumber(min)) {
      return [randomInteger(0, min), ii]
    }
    return [randomInteger(0, 1), index + 1]
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
    const maybeexpr = maybevalue.toLowerCase()

    // check for flag
    if (stringeval) {
      const maybeflag = READ_CONTEXT.get?.(maybevalue)
      if (ispresent(maybeflag)) {
        return [maybeflag, index + 1]
      }
    }

    // check for expressions
    switch (maybeexpr) {
      // zzt
      case 'aligned':
      case 'alligned': {
        // ALLIGNED
        // This flag is SET whenever the object is aligned with the player either horizontally or vertically.
        break
      }
      case 'contact': {
        // CONTACT
        // This flag is SET whenever the object is adjacent to (touching) the player.
        break
      }
      case 'blocked': {
        // BLOCKED <direction>
        // This flag is SET when the object is not free to move in the given direction, and
        // CLEAR when the object is free to move in the direction.
        break
      }
      case 'any': {
        // ANY <color> <item>
        // This flag is SET whenever the given kind is visible on the board
        break
      }
      // zss
      // numbers
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
      case 'func': {
        break
      }
    }
  }

  // pass through everything else
  return [maybevalue, index + 1]
}
