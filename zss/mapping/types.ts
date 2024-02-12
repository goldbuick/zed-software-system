import { PT } from './2d'

export function isNumber(word: any): word is number {
  return typeof word === 'number'
}

export function isString(word: any): word is string {
  return typeof word === 'string'
}

export function isArray(word: any): word is any[] {
  return Array.isArray(word)
}

export function ispt(pt: any): pt is PT {
  return typeof pt === 'object' && isNumber(pt.x) && isNumber(pt.y)
}
