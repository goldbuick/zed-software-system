/**
 * Pure helpers for the CST visitor: token/string extraction and small data helpers.
 */
import { IToken } from 'chevrotain'

export function tokenstring(token: IToken[] | undefined, defaultstr: string) {
  const [first] = token ?? []
  const tokenstr = (first?.image ?? defaultstr).trimStart()
  return tokenstr.replaceAll(/^"|"$/g, '')
}

/**
 * Whole-line text: keep leading spaces on unquoted lines.
 * Quoted lines: strip authoring indent + opening `"`, keep spaces after `"`,
 * strip optional trailing `"`.
 */
export function tokenstringtext(
  token: IToken[] | undefined,
  defaultstr: string,
) {
  const [first] = token ?? []
  const tokenstr = first?.image ?? defaultstr
  const m = /^(\s*)"(.*)$/.exec(tokenstr)
  if (m) {
    let body = m[2]
    if (body.endsWith('"')) {
      body = body.slice(0, -1)
    }
    return body
  }
  return tokenstr
}
