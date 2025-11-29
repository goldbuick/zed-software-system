import { pick, pickwith } from 'zss/mapping/array'
import { clamp, randominteger, randomintegerwith } from 'zss/mapping/number'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { memoryrun } from 'zss/memory'
import {
  findplayerforelement,
  listelementsbycolor,
  listelementsbykind,
} from 'zss/memory/atomics'
import { boardelementread, boardgetterrain } from 'zss/memory/board'
import { boardcheckmoveobject } from 'zss/memory/boardops'
import { bookelementdisplayread } from 'zss/memory/book'
import { BOARD_ELEMENT } from 'zss/memory/types'

import { isstrcategory, mapstrcategory, readcategory } from './category'
import { isstrcollision, mapstrcollision, readcollision } from './collision'
import {
  isstrcolor,
  mapstrcolor,
  readcolor,
  readstrbg,
  readstrcolor,
} from './color'
import { isstrdir, mapstrdir, readdir } from './dir'
import { readstrkindcolor, readstrkindname } from './kind'
import { ARG_TYPE, READ_CONTEXT, readargs } from './reader'
import { DIR, NAME } from './types'

// consider signaling the end as a pipe | ??
function readvargs(index: number, maxcount = 0): [any[], number] {
  const values: any[] = []

  let i = index
  for (; i < READ_CONTEXT.words.length; ) {
    const [value, ii] = readexpr(i)
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

    // if we're given a pipe also bail
    if (value === '|') {
      return [values, ii]
    }

    // next word
    i = ii
    values.push(value)

    // limit capture count
    if (maxcount > 0 && values.length >= maxcount) {
      return [values, i]
    }
  }

  return [values, i]
}

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
          {
            x: READ_CONTEXT.element?.x ?? -1,
            y: READ_CONTEXT.element?.y ?? -1,
          },
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
          {
            x: READ_CONTEXT.element?.x ?? -1,
            y: READ_CONTEXT.element?.y ?? -1,
          },
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
        const isblocked = boardcheckmoveobject(
          READ_CONTEXT.board,
          READ_CONTEXT.element,
          dir.destpt,
        )
        return [isblocked ? 1 : 0, iii]
      }
      case 'any': {
        // ANY <kind>
        // ANY <color>
        // ANY <dir> <kind>
        // ANY <dir> <color>
        const [value] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.ANY])
        if (isstrdir(value)) {
          const [dir, match, iii] = readargs(READ_CONTEXT.words, ii, [
            ARG_TYPE.DIR,
            ARG_TYPE.COLOR_OR_KIND,
          ])
          if (dir.targets.length) {
            const [maybename, maybecolor] = match
            const matchlist: BOARD_ELEMENT[] = []
            for (let i = 0; i < dir.targets.length; ++i) {
              const target = dir.targets[i]
              const anyexpr = [
                'any',
                'at',
                target.x,
                target.y,
                ...(isarray(maybecolor) ? maybecolor : []),
                maybename,
              ].filter((v) => v !== undefined)
              const [found] = readargs(anyexpr, 0, [ARG_TYPE.ANY])
              if (isarray(found) && found.length) {
                matchlist.push(...found)
              }
            }
            return [matchlist, iii]
          }

          // grab dest element from DIR
          let maybelement: MAYBE<BOARD_ELEMENT>
          switch (dir.layer) {
            default:
            case DIR.MID:
              maybelement = boardelementread(READ_CONTEXT.board, dir.destpt)
              break
            case DIR.GROUND:
              maybelement = boardgetterrain(
                READ_CONTEXT.board,
                dir.destpt.x,
                dir.destpt.y,
              )
              break
          }

          if (ispresent(maybelement)) {
            const display = bookelementdisplayread(maybelement)

            // color only match
            if (isstrcolor(match)) {
              const didmatch =
                readstrcolor(match) === display.color ||
                readstrbg(match) === display.bg
              return [didmatch ? [maybelement] : [], iii]
            }

            // kind match
            const maybename = NAME(readstrkindname(match))
            const maybecolor = readstrkindcolor(match)
            const didnotmatch =
              (maybename.length && maybename !== display.name) ||
              (ispresent(maybecolor) && maybecolor !== display.color)
            if (didnotmatch === false) {
              return [[maybelement], iii]
            }
          }

          return [[], iii]
        }

        // without dir
        const [match, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.COLOR_OR_KIND,
        ])

        // color check
        if (isstrcolor(match)) {
          const matchedelements = listelementsbycolor(READ_CONTEXT.board, match)
          return [matchedelements, iii]
        }

        // kind check
        const matchedelements = listelementsbykind(READ_CONTEXT.board, match)
        return [matchedelements, iii]
      }
      case 'countof': {
        // COUNTOF <kind>
        // COUNTOF <color>
        // COUNTOF <dir> <kind>
        // COUNTOF <dir> <color>
        const [value] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.ANY])
        if (isstrdir(value)) {
          const [dir, match, iii] = readargs(READ_CONTEXT.words, ii, [
            ARG_TYPE.DIR,
            ARG_TYPE.COLOR_OR_KIND,
          ])

          if (dir.targets.length) {
            let matchcount = 0
            const [maybename, maybecolor] = match
            for (let i = 0; i < dir.targets.length; ++i) {
              const target = dir.targets[i]
              const anyexpr = [
                'countof',
                'at',
                target.x,
                target.y,
                ...(isarray(maybecolor) ? maybecolor : []),
                maybename,
              ].filter((v) => v !== undefined)
              const [found] = readargs(anyexpr, 0, [ARG_TYPE.ANY])
              if (isnumber(found)) {
                matchcount += found
              }
            }
            return [matchcount, iii]
          }

          // grab dest element from DIR
          let maybelement: MAYBE<BOARD_ELEMENT>
          switch (dir.layer) {
            default:
            case DIR.MID:
              maybelement = boardelementread(READ_CONTEXT.board, dir.destpt)
              break
            case DIR.GROUND:
              maybelement = boardgetterrain(
                READ_CONTEXT.board,
                dir.destpt.x,
                dir.destpt.y,
              )
              break
          }

          if (ispresent(maybelement)) {
            const display = bookelementdisplayread(maybelement)

            // color only match
            if (isstrcolor(match)) {
              return [
                readstrcolor(match) === display.color ||
                readstrbg(match) === display.bg
                  ? 1
                  : 0,
                iii,
              ]
            }

            // kind match
            const maybename = NAME(readstrkindname(match))
            const maybecolor = readstrkindcolor(match)
            const namedoesmatch = maybename.length
              ? maybename === display.name
              : true
            const colordoesmatch = ispresent(maybecolor)
              ? maybecolor === display.color
              : true
            if (namedoesmatch && colordoesmatch) {
              return [1, iii]
            }
          }

          return [0, iii]
        }

        // without dir
        const [match, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.COLOR_OR_KIND,
        ])

        // color check
        if (isstrcolor(match)) {
          const matchedelements = listelementsbycolor(READ_CONTEXT.board, match)
          return [matchedelements.length, iii]
        }

        // kind check
        const matchedelements = listelementsbykind(READ_CONTEXT.board, match)
        return [matchedelements.length, iii]
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
      case 'intceil': {
        // INTCEIL <a>
        const [a, iii] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.NUMBER])
        return [Math.ceil(a), iii]
      }
      case 'intfloor': {
        // INTFLOOR <a>
        const [a, iii] = readargs(READ_CONTEXT.words, ii, [ARG_TYPE.NUMBER])
        return [Math.floor(a), iii]
      }
      case 'intround': {
        // INTROUND <a>
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
        const [values, iii] = readvargs(ii)
        return [Math.min(...values), iii]
      }
      case 'max': {
        // MAX <a> [b] [c] [d]
        const [values, iii] = readvargs(ii)
        return [Math.max(...values), iii]
      }
      case 'pick': {
        // PICK <a> [b] [c] [d]
        const [values, iii] = readvargs(ii)
        return [pick(values), iii]
      }
      case 'pickwith': {
        // PICKWITH <seed> <a> [b] [c] [d]
        const [seed, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.NUMBER_OR_STRING,
        ])
        const [values, iiii] = readvargs(iii)
        return [pickwith(`${seed}`, values), iiii]
      }
      case 'random': {
        // RANDOM <a> [b]
        const [values, iii] = readvargs(ii, 2)
        const [a, b] = values
        return [randominteger(a, b ?? 0), iii]
      }
      case 'randomwith': {
        // RANDOMWITH <seed> <a> [b]
        const [seed, iii] = readargs(READ_CONTEXT.words, ii, [
          ARG_TYPE.NUMBER_OR_STRING,
        ])
        const [values, iiii] = readvargs(iii, 2)
        const [a, b] = values
        return [randomintegerwith(`${seed}`, a, b ?? 0), iiii]
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
