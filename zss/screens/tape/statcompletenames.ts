import { CODE_PAGE_TYPE } from 'zss/memory/types'

/** Built-in @stat names per open codepage type (from memory/types.ts field keys). */
export function builtingstatnamesforcodepagetype(
  codetype: string | undefined,
): string[] {
  switch (codetype?.toLowerCase()) {
    case 'board':
    case `${CODE_PAGE_TYPE.BOARD}`:
      return [
        'isdark',
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
        'item',
        'group',
        'party',
        'player',
        'pushable',
        'collision',
        'breakable',
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
      return ['width', 'height']
    case 'palette':
    case `${CODE_PAGE_TYPE.PALETTE}`:
      return ['width', 'height']
    case 'loader':
    case `${CODE_PAGE_TYPE.LOADER}`:
      return ['name']
    default:
      return ['name', 'type']
  }
}
