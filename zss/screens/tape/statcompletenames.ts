import { CODE_PAGE_TYPE } from 'zss/memory/types'

/** First-line @stat type prefixes (@board name, @object gem, …). */
export const CODE_PAGE_TYPE_STAT_KEYWORDS = [
  'loader',
  'board',
  'object',
  'terrain',
  'charset',
  'palette',
  'txt',
] as const

export function iscodepagetypestatkeyword(word: string): boolean {
  const lower = word.toLowerCase()
  for (let i = 0; i < CODE_PAGE_TYPE_STAT_KEYWORDS.length; ++i) {
    if (CODE_PAGE_TYPE_STAT_KEYWORDS[i] === lower) {
      return true
    }
  }
  return false
}

function indexedstatnames(prefix: string, count: number): string[] {
  const names: string[] = []
  for (let i = 0; i < count; ++i) {
    names.push(`${prefix}${i}`)
  }
  return names
}

/** Built-in @stat names per open codepage type (from memory/types.ts field keys). */
export function builtingstatnamesforcodepagetype(
  codetype: string | undefined,
): string[] {
  switch (codetype?.toLowerCase()) {
    case 'board':
    case `${CODE_PAGE_TYPE.BOARD}`:
      return [
        'isdark',
        'notdark',
        'startx',
        'starty',
        'over',
        'under',
        'camera',
        'graphics',
        'facing',
        'charset',
        'palette',
        'exitnorth',
        'exitsouth',
        'exitwest',
        'exiteast',
        'timelimit',
        'restartonzap',
        'norestartonzap',
        'maxplayershots',
        'b1',
        'b2',
        'b3',
        'b4',
        'b5',
        'b6',
        'b7',
        'b8',
        'b9',
        'b10',
      ]
    case 'object':
    case `${CODE_PAGE_TYPE.OBJECT}`:
    case 'terrain':
    case `${CODE_PAGE_TYPE.TERRAIN}`:
      return [
        'kind',
        'name',
        'char',
        'color',
        'bg',
        'displaychar',
        'displaycolor',
        'displaybg',
        'displayname',
        'light',
        'lightdir',
        'isitem',
        'notitem',
        'group',
        'party',
        'player',
        'ispushable',
        'notpushable',
        'iswalk',
        'iswalking',
        'iswalkable',
        'isswim',
        'isswimming',
        'isswimable',
        'issolid',
        'isbullet',
        'isghost',
        'isbreakable',
        'notbreakable',
        'tickertext',
        'tickertime',
        'p1',
        'p2',
        'p3',
        'p4',
        'p5',
        'p6',
        'p7',
        'p8',
        'p9',
        'p10',
        'cycle',
        'stepx',
        'stepy',
        'shootx',
        'shooty',
        'sender',
        'code',
      ]
    case 'charset':
    case `${CODE_PAGE_TYPE.CHARSET}`:
      return indexedstatnames('char', 256)
    case 'palette':
    case `${CODE_PAGE_TYPE.PALETTE}`:
      return indexedstatnames('color', 16)
    case 'loader':
    case `${CODE_PAGE_TYPE.LOADER}`:
      return ['event', 'format']
    default:
      return []
  }
}
