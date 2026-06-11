import type { SCRIPT_PATCH_MODE } from 'zss/feature/heavy/llm/scripttool'
import { patchcodepagescript } from 'zss/feature/heavy/scriptpatch'
import { compile } from 'zss/feature/lang/backend/typescript/generator'
import type { LANG_ERROR } from 'zss/feature/lang/backend/typescript/lexer'
import { ispresent } from 'zss/mapping/types'
import {
  memoryreadcodepagename,
  memoryresetcodepagestats,
} from 'zss/memory/codepageoperations'
import { memoryreadcodepagebyid } from 'zss/memory/codepages'
import {
  memorycanruncommand,
  memorymapcommandtofamily,
} from 'zss/memory/permissions'

export type CompilescriptQueryResult = {
  ok: boolean
  errors: LANG_ERROR[]
  labels: Record<string, number[]>
}

export type CodepageQueryResult = {
  id: string
  name: string
  code: string
}

export type WritescriptQueryResult = {
  ok: boolean
  page_id?: string
  error?: string
}

export function memoryquerycompilescript(
  name: string,
  text: string,
): CompilescriptQueryResult {
  const result = compile(name, text)
  const errors = result.errors ?? []
  if (errors.length > 0) {
    return { ok: false, errors, labels: {} }
  }
  return { ok: true, errors: [], labels: result.labels ?? {} }
}

export function memoryquerycodepage(
  pageid: string,
): CodepageQueryResult | { error: string } {
  const page = memoryreadcodepagebyid(pageid)
  if (!ispresent(page)) {
    return { error: 'codepage_not_found' }
  }
  return {
    id: page.id,
    name: memoryreadcodepagename(page),
    code: page.code,
  }
}

export function memoryquerywritescript(
  player: string,
  pageid: string,
  snippet: string,
  mode: SCRIPT_PATCH_MODE,
): WritescriptQueryResult {
  if (!memorycanruncommand(player, 'pageopen')) {
    const family = memorymapcommandtofamily('pageopen')
    return { ok: false, error: `permission_denied:${family}` }
  }
  const page = memoryreadcodepagebyid(pageid)
  if (!ispresent(page)) {
    return { ok: false, error: 'codepage_not_found' }
  }
  const compiled = memoryquerycompilescript(pageid, snippet)
  if (!compiled.ok) {
    return { ok: false, error: 'compile_failed' }
  }
  page.code = patchcodepagescript(page.code, snippet, mode)
  memoryresetcodepagestats(page)
  return { ok: true, page_id: page.id }
}
