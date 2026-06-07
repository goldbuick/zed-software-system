import type { LANG_ERROR } from 'zss/feature/lang/backend/typescript/lexer'
import { compilescript } from 'zss/feature/lang/langcompileclient'

import type { ParsedToolCall } from './parsetoolcalls'
import { WRITE_ZSS_SCRIPT_TOOL_NAME } from './toolnames'

export type SCRIPT_PATCH_MODE = 'append' | 'replace_handler' | 'replace_all'

export type ParsedScriptToolCall = {
  page_id: string
  snippet: string
  mode: SCRIPT_PATCH_MODE
}

const PATCH_MODES: SCRIPT_PATCH_MODE[] = [
  'append',
  'replace_handler',
  'replace_all',
]

function ispatchmode(v: unknown): v is SCRIPT_PATCH_MODE {
  return typeof v === 'string' && PATCH_MODES.includes(v as SCRIPT_PATCH_MODE)
}

export function validatedscripttoolcalls(
  calls: ParsedToolCall[],
): ParsedScriptToolCall[] {
  const out: ParsedScriptToolCall[] = []
  for (let i = 0; i < calls.length; ++i) {
    const c = calls[i]
    if (c.name !== WRITE_ZSS_SCRIPT_TOOL_NAME) {
      continue
    }
    const pageid = c.arguments.page_id
    const snippet = c.arguments.snippet
    const mode = c.arguments.mode
    if (typeof pageid !== 'string' || typeof snippet !== 'string') {
      continue
    }
    const trimmedpage = pageid.trim()
    const trimmedsnippet = snippet.trim()
    if (!trimmedpage || !trimmedsnippet) {
      continue
    }
    out.push({
      page_id: trimmedpage,
      snippet: trimmedsnippet.endsWith('\n')
        ? trimmedsnippet
        : `${trimmedsnippet}\n`,
      mode: ispatchmode(mode) ? mode : 'append',
    })
  }
  return out
}

export type ScriptcompileResult = {
  ok: boolean
  errors: LANG_ERROR[]
  labels: Record<string, number[]>
}

export function compilescriptsnippet(
  name: string,
  snippet: string,
): ScriptcompileResult {
  const result = compilescript(name, snippet)
  const errors = result.errors ?? []
  if (errors.length > 0) {
    return { ok: false, errors, labels: {} }
  }
  return { ok: true, errors: [], labels: result.labels ?? {} }
}
