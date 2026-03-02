/**
 * Server CLI: convert $COLOR $CHAR textformat to ANSI terminal codes.
 * Maps ZSS color tokens to ANSI 256/16-color escape sequences.
 * CP437 codes ($0-255) are mapped to Unicode for correct terminal display.
 */
import { colorconsts } from 'zss/words/color'
import { cp437ToChar } from 'zss/words/cp437'
import { tokenize } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

const metakey =
  typeof process !== 'undefined' && process.platform === 'darwin'
    ? 'cmd'
    : 'ctrl'

// Map COLOR enum index to ANSI SGR codes (foreground)
const COLOR_TO_ANSI: Record<number, number> = {
  [COLOR.BLACK]: 30,
  [COLOR.DKBLUE]: 34,
  [COLOR.DKGREEN]: 32,
  [COLOR.DKCYAN]: 36,
  [COLOR.DKRED]: 31,
  [COLOR.DKPURPLE]: 35,
  [COLOR.DKYELLOW]: 33,
  [COLOR.LTGRAY]: 37,
  [COLOR.DKGRAY]: 90,
  [COLOR.BLUE]: 94,
  [COLOR.GREEN]: 92,
  [COLOR.CYAN]: 96,
  [COLOR.RED]: 91,
  [COLOR.PURPLE]: 95,
  [COLOR.YELLOW]: 93,
  [COLOR.WHITE]: 97,
  [COLOR.BLBLACK]: 30,
  [COLOR.BLDKBLUE]: 34,
  [COLOR.BLDKGREEN]: 32,
  [COLOR.BLDKCYAN]: 36,
  [COLOR.BLDKRED]: 31,
  [COLOR.BLDKPURPLE]: 35,
  [COLOR.BLDKYELLOW]: 33,
  [COLOR.BLLTGRAY]: 37,
  [COLOR.BLDKGRAY]: 90,
  [COLOR.BLBLUE]: 94,
  [COLOR.BLGREEN]: 92,
  [COLOR.BLCYAN]: 96,
  [COLOR.BLRED]: 91,
  [COLOR.BLPURPLE]: 95,
  [COLOR.BLYELLOW]: 93,
  [COLOR.BLWHITE]: 97,
}

const BG_TO_ANSI: Record<number, number> = {
  [COLOR.ONBLACK]: 40,
  [COLOR.ONDKBLUE]: 44,
  [COLOR.ONDKGREEN]: 42,
  [COLOR.ONDKCYAN]: 46,
  [COLOR.ONDKRED]: 41,
  [COLOR.ONDKPURPLE]: 45,
  [COLOR.ONDKYELLOW]: 43,
  [COLOR.ONLTGRAY]: 47,
  [COLOR.ONDKGRAY]: 100,
  [COLOR.ONBLUE]: 104,
  [COLOR.ONGREEN]: 102,
  [COLOR.ONCYAN]: 106,
  [COLOR.ONRED]: 101,
  [COLOR.ONPURPLE]: 105,
  [COLOR.ONYELLOW]: 103,
  [COLOR.ONWHITE]: 107,
}

const RESET = '\x1b[0m'

const useColor =
  process.env.NO_COLOR === undefined &&
  process.env.TERM !== 'dumb' &&
  process.stdout?.isTTY

function ansiFg(color: number): string {
  if (!useColor) {
    return ''
  }
  const code = COLOR_TO_ANSI[color]
  return code !== undefined ? `\x1b[${code}m` : ''
}

function ansiBg(color: number): string {
  if (!useColor) {
    return ''
  }
  const code = BG_TO_ANSI[color]
  return code !== undefined ? `\x1b[${code}m` : ''
}

export function textformatToAnsi(text: string): string {
  const result = tokenize(text)
  if (!result.tokens || result.tokens.length === 0) {
    return ''
  }

  const { tokens } = result
  let output = ''

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const tokenType = token.tokenType as { name?: string }
    const image = token.image

    if (tokenType.name === 'EscapedDollar') {
      output += '$'
      continue
    }
    if (tokenType.name === 'Newline') {
      output += '\n'
      continue
    }
    if (tokenType.name === 'StringLiteral') {
      output += image
      continue
    }
    if (tokenType.name === 'StringLiteralDouble') {
      output += image.slice(1, -1).replaceAll('\\"', '"')
      continue
    }
    if (tokenType.name === 'NumberLiteral') {
      const code = parseInt(image.replace(/^\$-?/, ''), 10)
      output +=
        !isNaN(code) && code >= 0 && code <= 255 ? cp437ToChar(code) : ''
      continue
    }
    if (
      tokenType.name === 'Whitespace' ||
      tokenType.name === 'WhitespaceSkipped'
    ) {
      output += image
      continue
    }
    if (tokenType.name === 'MetaKey') {
      output += metakey
      continue
    }
    if (tokenType.name === 'Center' || tokenType.name === 'HyperLinkText') {
      continue
    }
    if (tokenType.name === 'MaybeFlag') {
      output += image
      continue
    }

    const colorKey = tokenType.name?.toLowerCase()
    if (colorKey && colorKey in colorconsts) {
      const constName = (colorconsts as Record<string, string>)[colorKey]
      const colorVal = (COLOR as unknown as Record<string, number>)[constName]
      if (colorVal !== undefined) {
        if (constName === 'ONCLEAR') {
          output += RESET
        } else if (constName.startsWith('ON') && constName !== 'ONCLEAR') {
          output += ansiBg(colorVal)
        } else {
          output += ansiFg(colorVal)
        }
        continue
      }
    }

    output += image
  }

  return output + (useColor ? RESET : '')
}
