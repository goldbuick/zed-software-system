import {
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { isstrcategory } from 'zss/words/category'
import { isstrcollision } from 'zss/words/collision'
import { isstrcolor, STR_COLOR } from 'zss/words/color'
import { isstrdir, STR_DIR } from 'zss/words/dir'
import { isstrgroup } from 'zss/words/group'
import { CATEGORY, COLLISION, COLOR, DIR, NAME } from 'zss/words/types'

const COLOR_STAT_NAMES = new Set([
  'color',
  'bg',
  'displaycolor',
  'displaybg',
])

function lowerconst(value: string): string {
  return value.toLowerCase()
}

function formatconstlist(values: string[]): string {
  return values.map(lowerconst).join(' ')
}

/** KIND and GROUP share `[string, STR_COLOR?]`. */
function formatnamedcolorable(value: [string, STR_COLOR?]): string {
  const [itemname, strcolor] = value
  if (isstrcolor(strcolor)) {
    return `${formatconstlist(strcolor)} ${itemname}`
  }
  return itemname
}

function formatstrdir(dir: STR_DIR): string {
  return dir
    .map((segment) => {
      if (isnumber(segment)) {
        return `${segment}`
      }
      if (isstring(segment)) {
        if (ispresent(DIR[segment as keyof typeof DIR])) {
          return lowerconst(segment)
        }
        return segment
      }
      if (isstrgroup(segment)) {
        return formatnamedcolorable(segment)
      }
      return `${segment}`
    })
    .join(' ')
}

function isknownenumconststring(value: string): boolean {
  return (
    (ispresent(COLOR[value as keyof typeof COLOR]) && isstring(value)) ||
    (ispresent(DIR[value as keyof typeof DIR]) && isstring(value)) ||
    (ispresent(COLLISION[value as keyof typeof COLLISION]) &&
      isstring(value)) ||
    (ispresent(CATEGORY[value as keyof typeof CATEGORY]) && isstring(value))
  )
}

function formatnumericstat(
  value: number,
  name: string,
): string | number | undefined {
  if (COLOR_STAT_NAMES.has(name)) {
    const label = COLOR[value]
    if (isstring(label)) {
      return lowerconst(label)
    }
  }
  if (name === 'collision') {
    const label = COLLISION[value]
    if (isstring(label)) {
      return lowerconst(label)
    }
  }
  if (name === 'category') {
    const label = CATEGORY[value]
    if (isstring(label)) {
      return lowerconst(label)
    }
  }
  return undefined
}

/**
 * Display stringify for `$name` template expansion.
 * Pass the flag/stat name so numeric enums (color, collision, …) can be named
 * without treating every number as a color.
 */
export function formatprintvalue(
  value: unknown,
  name?: string,
): string | number | boolean {
  if (isstrcolor(value)) {
    return formatconstlist(value)
  }
  if (isstrcollision(value)) {
    return formatconstlist(value)
  }
  if (isstrcategory(value)) {
    return formatconstlist(value)
  }
  if (isstrdir(value)) {
    return formatstrdir(value)
  }
  // KIND / GROUP — same runtime shape; after typed const arrays
  if (isstrgroup(value)) {
    return formatnamedcolorable(value)
  }

  const statname = isstring(name) ? NAME(name) : ''
  if (isnumber(value) && statname) {
    const formatted = formatnumericstat(value, statname)
    if (ispresent(formatted)) {
      return formatted
    }
  }

  if (isstring(value) && isknownenumconststring(value)) {
    return lowerconst(value)
  }

  if (isarray(value)) {
    return `array ${value.length} ${value.length === 1 ? 'item' : 'items'}`
  }
  if (typeof value === 'object' && value !== null) {
    return `obj ${Object.keys(value).join(', ')}`
  }
  if (typeof value === 'boolean' || isnumber(value) || isstring(value)) {
    return value
  }
  return `${value ?? ''}`
}
