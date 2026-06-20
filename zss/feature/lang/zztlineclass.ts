/**
 * ZZT-OOP / ZSS codepage @-line keywords for lexer stat vs text classification.
 * Keep in sync with ops/fixtures/lang/zzt-ref/commands.json
 */

const ZSS_STAT_KEYWORDS = new Set([
  'object',
  'scroll',
  'passage',
  'duplicator',
  'bomb',
  'bullet',
  'blinkwall',
  'transporter',
  'bear',
  'ruffian',
  'slime',
  'shark',
  'spinninggun',
  'pusher',
  'lion',
  'tiger',
  'blinkns',
  'head',
  'segment',
  'text',
  'player',
  'terrain',
  'cycle',
  'color',
  'bg',
  'char',
  'stepx',
  'stepy',
  'p1',
  'p2',
  'p3',
  'score',
  'ispushable',
  'isobject',
  'isterrain',
  'issolid',
  'iswalk',
  'isswim',
  'isbullet',
  'isghost',
  'iswalking',
  'iswalkable',
  'isswimming',
  'isswimmable',
])

export function linestartoffset(text: string, pos: number): number {
  let i = pos
  while (i > 0 && text[i - 1] !== '\n') {
    i -= 1
  }
  return i
}

export function isfirstline(text: string, pos: number): boolean {
  return linestartoffset(text, pos) === 0
}

export function statwordat(text: string, pos: number): string | undefined {
  if (text[pos] !== '@') {
    return undefined
  }
  let end = pos + 1
  while (end < text.length && text[end] !== ' ' && text[end] !== '\n') {
    end += 1
  }
  const word = text.slice(pos + 1, end).trim()
  return word.length > 0 ? word.toLowerCase() : undefined
}

export function isinheaderblock(text: string, pos: number): boolean {
  const currentline = linestartoffset(text, pos)
  let i = 0
  while (i < currentline) {
    while (i < currentline && (text[i] === ' ' || text[i] === '\t')) {
      i += 1
    }
    if (i >= currentline) {
      break
    }
    if (text[i] === '\n') {
      i += 1
      continue
    }
    if (text[i] !== '@') {
      return false
    }
    while (i < currentline && text[i] !== '\n') {
      i += 1
    }
    if (i < currentline && text[i] === '\n') {
      i += 1
    }
  }
  return true
}

export function shouldstatat(text: string, startoffset: number): boolean {
  if (text[startoffset] !== '@') {
    return false
  }
  const word = statwordat(text, startoffset)
  if (!word) {
    return false
  }
  if (isfirstline(text, startoffset)) {
    return true
  }
  if (isinheaderblock(text, startoffset)) {
    return true
  }
  return ZSS_STAT_KEYWORDS.has(word)
}

export function iscommandat(text: string, startoffset: number): boolean {
  if (text[startoffset] !== '#') {
    return false
  }
  const linestart = linestartoffset(text, startoffset)
  if (startoffset === linestart) {
    return true
  }
  const prefix = text.slice(linestart, startoffset).trimEnd()
  // ZZT inline stack: /i#char 53, ?n#send label
  if (/^([/?][a-z]*\s*)+$/i.test(prefix)) {
    return true
  }
  return false
}

export function iscommandwordat(text: string, startoffset: number): boolean {
  const linestart = linestartoffset(text, startoffset)
  const before = text.slice(linestart, startoffset).trimEnd()
  if (before === '#') {
    return true
  }
  if (/(?:[/?][a-z]*\s*)+#$/i.test(before)) {
    return true
  }
  return false
}

export function iszztstatkeyword(word: string): boolean {
  return ZSS_STAT_KEYWORDS.has(word.toLowerCase())
}
