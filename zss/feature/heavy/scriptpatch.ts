import type { SCRIPT_PATCH_MODE } from 'zss/feature/heavy/llm/scripttool'

const LABEL_LINE = /^:([^;\n]+)/

function handlerlabel(snippet: string): string | undefined {
  const match = LABEL_LINE.exec(snippet.trimStart())
  return match ? match[1].trim() : undefined
}

function replacelabelblock(code: string, label: string, block: string): string {
  const labelpattern = new RegExp(
    `^:${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
    'm',
  )
  const start = code.search(labelpattern)
  if (start < 0) {
    return `${code.trimEnd()}\n${block.trimEnd()}\n`
  }
  const afterlabel = start + code.slice(start).indexOf('\n') + 1
  let end = code.length
  const rest = code.slice(afterlabel)
  const nextlabel = rest.search(/^:[^;\n]+/m)
  if (nextlabel >= 0) {
    end = afterlabel + nextlabel
  }
  return `${code.slice(0, start)}${block.trimEnd()}\n${code.slice(end).trimStart()}`
}

export function patchcodepagescript(
  code: string,
  snippet: string,
  mode: SCRIPT_PATCH_MODE,
): string {
  switch (mode) {
    case 'replace_all':
      return snippet.endsWith('\n') ? snippet : `${snippet}\n`
    case 'replace_handler': {
      const label = handlerlabel(snippet)
      if (!label) {
        return `${code.trimEnd()}\n${snippet.trimEnd()}\n`
      }
      return replacelabelblock(code, label, snippet)
    }
    default:
      return `${code.trimEnd()}\n${snippet.trimEnd()}\n`
  }
}
