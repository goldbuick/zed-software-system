import { NAME, STAT_TYPE } from './types'

export function statformat(label: string, words: string[], first = true) {
  if (first) {
    const [maybetype, ...values] = words
    const type = NAME(maybetype ?? '')
    switch (type) {
      default:
        return {
          type: STAT_TYPE.OBJECT,
          values: words,
        }
      case 'loader':
        return {
          type: STAT_TYPE.LOADER,
          values: [],
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
    }
  } else {
    const [target, maybetype, ...maybevalues] = words
    const type = NAME(maybetype ?? '')
    const values = [target, label, ...maybevalues]
    switch (type) {
      default:
        return {
          type: STAT_TYPE.CONST,
          values: words,
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
      case 'copyit':
        return {
          type: STAT_TYPE.COPYIT,
          values,
        }
      case 'openit':
        return {
          type: STAT_TYPE.OPENIT,
          values,
        }
      case 'zssedit':
        return {
          type: STAT_TYPE.ZSSEDIT,
          values,
        }
      case 'charedit':
        return {
          type: STAT_TYPE.CHAREDIT,
          values,
        }
      case 'coloredit':
        return {
          type: STAT_TYPE.COLOREDIT,
          values,
        }
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
    case STAT_TYPE.COPYIT:
      return 'copyit'
    case STAT_TYPE.OPENIT:
      return 'openit'
    case STAT_TYPE.ZSSEDIT:
      return 'zssedit'
    case STAT_TYPE.CHAREDIT:
      return 'charedit'
    case STAT_TYPE.COLOREDIT:
      return 'coloredit'
  }
}
