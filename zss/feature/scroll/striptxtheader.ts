import { memoryreadcodepagetype } from 'zss/memory/codepageoperations'
import type { CODE_PAGE } from 'zss/memory/types'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

export function scrollsourceistxtcodepage(source: string): boolean {
  const lines = source.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    return /^@txt\s+\S/i.test(trimmed)
  }
  return false
}

export function striptxtcodepageheader(source: string): string {
  const lines = source.split('\n')
  let skippedheader = false
  const out: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!skippedheader && trimmed && /^@txt\s+\S/i.test(trimmed)) {
      skippedheader = true
      continue
    }
    out.push(line)
  }
  while (out.length > 0 && out[0].trim() === '') {
    out.shift()
  }
  return out.join('\n')
}

export function readtxtcodepagebody(codepage: CODE_PAGE): string | undefined {
  if (memoryreadcodepagetype(codepage) !== CODE_PAGE_TYPE.TXT) {
    return undefined
  }
  return striptxtcodepageheader(codepage.code ?? '')
}
