import { STAT_TYPE } from './types'

export function statformat(words: string[], first = true) {
  const [maybetype, ...values] = words
  switch (maybetype.toLowerCase()) {
    default:
      if (first) {
        return {
          type: STAT_TYPE.OBJECT,
          values: words,
        }
      } else {
        return {
          type: STAT_TYPE.CONST,
          values: words,
        }
      }
    case 'loader':
      return {
        type: STAT_TYPE.LOADER,
        values,
      }
    case 'board':
      return {
        type: STAT_TYPE.BOARD,
        values,
      }
    case 'object':
      return {
        type: STAT_TYPE.OBJECT,
        values,
      }
    case 'terrain':
      return {
        type: STAT_TYPE.TERRAIN,
        values,
      }
    case 'charset':
      return {
        type: STAT_TYPE.CHARSET,
        values,
      }
    case 'palette':
      return {
        type: STAT_TYPE.PALETTE,
        values,
      }
    case 'rn':
    case 'range':
      return {
        type: STAT_TYPE.RANGE,
        values,
      }
    case 'sl':
    case 'select':
      return {
        type: STAT_TYPE.SELECT,
        values,
      }
    case 'nm':
    case 'number':
      return {
        type: STAT_TYPE.NUMBER,
        values,
      }
    case 'tx':
    case 'text':
      return {
        type: STAT_TYPE.TEXT,
        values,
      }
    case 'ln':
    case 'link':
      return {
        type: STAT_TYPE.LINK,
        values,
      }
    case 'hk':
    case 'hotkey':
      return {
        type: STAT_TYPE.HOTKEY,
        values,
      }
    case 'scroll':
      return {
        type: STAT_TYPE.SCROLL,
        values,
      }
    case 'copyit':
      return {
        type: STAT_TYPE.COPYIT,
        values,
      }
  }
}

export function stattypestring(type: STAT_TYPE) {
  switch (type) {
    case STAT_TYPE.LOADER:
      return 'loader'
    case STAT_TYPE.BOARD:
      return 'board'
    case STAT_TYPE.OBJECT:
      return 'object'
    case STAT_TYPE.TERRAIN:
      return 'terrain'
    case STAT_TYPE.CHARSET:
      return 'charset'
    case STAT_TYPE.PALETTE:
      return 'palette'
    case STAT_TYPE.CONST:
      return 'const'
    case STAT_TYPE.RANGE:
      return 'range'
    case STAT_TYPE.SELECT:
      return 'select'
    case STAT_TYPE.NUMBER:
      return 'number'
    case STAT_TYPE.TEXT:
      return 'text'
    case STAT_TYPE.LINK:
      return 'link'
    case STAT_TYPE.HOTKEY:
      return 'hotkey'
    case STAT_TYPE.SCROLL:
      return 'scroll'
    case STAT_TYPE.COPYIT:
      return 'copyit'
  }
}
