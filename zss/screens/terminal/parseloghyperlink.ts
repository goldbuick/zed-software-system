import { HyperLinkText, tokenize } from 'zss/words/textformat'

/** Placeholder so lexer does not treat internal payload `;` as hyperlink label start. */
const SEMI_PH = '\uFFFC'

/**
 * Parse the inner part of a terminal log hyperlink (after the leading `!` from tape).
 * Splits payload vs visible label on the **last** raw `;` so payloads like
 * `copyit foo;bar` stay intact; tokenize only the payload so `$59`-decoded semicolons work.
 */
export function parseloghyperlink(hyperlink: string): {
  label: string
  words: string[]
} {
  const lastsemi = hyperlink.lastIndexOf(';')
  if (lastsemi < 0) {
    let label = 'PRESS ME'
    const words: string[] = []
    const result = tokenize(hyperlink, true)
    if (!result.tokens) {
      return { label, words }
    }
    for (let i = 0; i < result.tokens.length; ++i) {
      const tok = result.tokens[i]
      switch (tok.tokenType) {
        case HyperLinkText:
          label = tok.image.slice(1)
          break
        default:
          words.push(tok.image)
      }
    }
    return { label, words }
  }
  const payload = hyperlink.slice(0, lastsemi)
  const label = hyperlink.slice(lastsemi + 1)
  const escaped = payload.replaceAll(';', SEMI_PH)
  const result = tokenize(escaped, true)
  const words: string[] = []
  if (!result.tokens) {
    return { label, words }
  }
  for (let i = 0; i < result.tokens.length; ++i) {
    words.push(result.tokens[i].image.replaceAll(SEMI_PH, ';'))
  }
  return { label, words }
}
