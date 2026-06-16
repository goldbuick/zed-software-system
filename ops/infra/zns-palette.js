/** Source of truth: zss/feature/palette.ts (16 ZZT colors, 6-bit RGB → 8-bit hex). */
const PALETTE_HEX =
  '00000000002a002a00002a2a2a00002a002a2a15002a2a2a15151515153f153f15153f3f3f15153f153f3f3f153f3f3f'

function hexbyte(value) {
  const n = Number.parseInt(value, 16)
  const scaled = Math.round((n * 255) / 63)
  return scaled.toString(16).padStart(2, '0')
}

function parsepalettehex(source) {
  const out = []
  for (let i = 0; i < source.length; i += 6) {
    const chunk = source.slice(i, i + 6)
    out.push(
      `#${hexbyte(chunk.slice(0, 2))}${hexbyte(chunk.slice(2, 4))}${hexbyte(chunk.slice(4, 6))}`,
    )
  }
  return out
}

export const ZNS_ZZT_FG = parsepalettehex(PALETTE_HEX)

/** Mirrors zss/words/colorconsts.ts keys (lowercase). */
export const ZNS_COLOR_NAMES = new Set([
  'black',
  'dkblue',
  'dkgreen',
  'dkcyan',
  'dkred',
  'dkpurple',
  'dkyellow',
  'ltgray',
  'dkgray',
  'blue',
  'green',
  'cyan',
  'red',
  'purple',
  'yellow',
  'white',
  'brown',
  'dkwhite',
  'ltgrey',
  'gray',
  'grey',
  'dkgrey',
  'ltblack',
  'onblack',
  'ondkblue',
  'ondkgreen',
  'ondkcyan',
  'ondkred',
  'ondkpurple',
  'ondkyellow',
  'onltgray',
  'ondkgray',
  'onblue',
  'ongreen',
  'oncyan',
  'onred',
  'onpurple',
  'onyellow',
  'onwhite',
  'onbrown',
  'ondkwhite',
  'onltgrey',
  'ongray',
  'ongrey',
  'ondkgrey',
  'onltblack',
  'onclear',
  'blblack',
  'bldkblue',
  'bldkgreen',
  'bldkcyan',
  'bldkred',
  'bldkpurple',
  'bldkyellow',
  'blltgray',
  'bldkgray',
  'blblue',
  'blgreen',
  'blcyan',
  'blred',
  'blpurple',
  'blyellow',
  'blwhite',
  'blbrown',
  'bldkwhite',
  'blltgrey',
  'blgray',
  'blgrey',
  'bldkgrey',
  'blltblack',
])

const FG_ALIASES = {
  brown: 'dkyellow',
  dkwhite: 'ltgray',
  ltgrey: 'ltgray',
  gray: 'ltgray',
  grey: 'ltgray',
  dkgrey: 'dkgray',
  ltblack: 'dkgray',
}

const BG_ALIASES = {
  onbrown: 'ondkyellow',
  ondkwhite: 'onltgray',
  onltgrey: 'onltgray',
  ongray: 'onltgray',
  ongrey: 'onltgray',
  ondkgrey: 'ondkgray',
  onltblack: 'ondkgray',
}

const BL_ALIASES = {
  blbrown: 'bldkyellow',
  bldkwhite: 'blltgray',
  blltgrey: 'blltgray',
  blgray: 'blltgray',
  blgrey: 'blltgray',
  bldkgrey: 'bldkgray',
  blltblack: 'bldkgray',
}

const FG_INDEX = {
  black: 0,
  dkblue: 1,
  dkgreen: 2,
  dkcyan: 3,
  dkred: 4,
  dkpurple: 5,
  dkyellow: 6,
  ltgray: 7,
  dkgray: 8,
  blue: 9,
  green: 10,
  cyan: 11,
  red: 12,
  purple: 13,
  yellow: 14,
  white: 15,
}

export function resolvefgindex(name) {
  const key = FG_ALIASES[name] ?? name
  return FG_INDEX[key]
}

export function resolvebgindex(name) {
  const key = BG_ALIASES[name] ?? name
  if (!key.startsWith('on')) {
    return undefined
  }
  const base = key.slice(2)
  return resolvefgindex(base)
}

export function resolveblindex(name) {
  const key = BL_ALIASES[name] ?? name
  if (!key.startsWith('bl')) {
    return undefined
  }
  const base = key.slice(2)
  return resolvefgindex(base)
}

export function fghex(index) {
  return ZNS_ZZT_FG[index ?? 15] ?? ZNS_ZZT_FG[15]
}

export function matchcolorname(raw) {
  let name = String(raw ?? '').toLowerCase()
  while (name.length > 0) {
    if (ZNS_COLOR_NAMES.has(name)) {
      return name
    }
    name = name.slice(0, -1)
  }
  return ''
}
