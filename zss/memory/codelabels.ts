import { label, tokenize } from 'zss/feature/lang/backend/typescript/lexer'
import { memorylistallcodepagewithtype } from 'zss/memory/codepages'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

function addlabelsfromcode(code: string, into: Set<string>) {
  const source = code.endsWith('\n') ? code : `${code}\n`
  const result = tokenize(source)
  const tokens = result.tokens ?? []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.tokenTypeIdx !== label.tokenTypeIdx) {
      continue
    }
    const image = token.image ?? ''
    const trimmed = image.startsWith(':') ? image.slice(1) : image
    const name = NAME(trimmed)
    if (name) {
      into.add(`:${name}`)
    }
  }
}

/** Unique `:label` names from object and loader codepages (sorted). */
export function memorycollectcodelabels(): string[] {
  const labels = new Set<string>()
  const pages = [
    ...memorylistallcodepagewithtype(CODE_PAGE_TYPE.OBJECT),
    ...memorylistallcodepagewithtype(CODE_PAGE_TYPE.LOADER),
  ]
  for (let i = 0; i < pages.length; i++) {
    const code = pages[i].code ?? ''
    if (code) {
      addlabelsfromcode(code, labels)
    }
  }
  return [...labels].sort((a, b) => a.localeCompare(b))
}
