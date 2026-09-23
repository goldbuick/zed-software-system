/**
 * Pure helpers for the CST visitor: token/string extraction and small data helpers.
 */
import { IToken } from 'chevrotain'

export function tokenstring(token: IToken[] | undefined, defaultstr: string) {
  const [first] = token ?? []
  const tokenstr = (first?.image ?? defaultstr).trimStart()
  return tokenstr.replaceAll(/^"|"$/g, '')
}

/** Whole-line text: keep leading spaces; still strip optional surrounding quotes. */
export function tokenstringtext(
  token: IToken[] | undefined,
  defaultstr: string,
) {
  const [first] = token ?? []
  const tokenstr = first?.image ?? defaultstr
  return tokenstr.replaceAll(/^"|"$/g, '')
}
