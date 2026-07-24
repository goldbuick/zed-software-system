import type { DIR_COMPLETION_PHASE } from 'zss/feature/lang/backend/typescript/completioncontext'
import type {
  AUTOCOMPLETE_EDITOR_SOURCE,
  AUTOCOMPLETE_WORDLIST,
  COMMAND_ARG_AUTOCOMPLETE,
  COMMAND_ARGS_SIGNATURE,
} from 'zss/firmware'
import { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import { isarray, ispresent } from 'zss/mapping/types'
import { ARG_TYPE } from 'zss/words/types'

import type { EDITOR_COMPLETE_CONTEXT } from './editorcomplete'

export type AUTO_COMPLETE_SUGGESTION = {
  word: string
  category: string
}

function tagwords(
  words: string[],
  category: string,
): AUTO_COMPLETE_SUGGESTION[] {
  return words.map((word) => ({ word, category }))
}

function tagrecordkeys(
  rec: Record<string, unknown>,
  category: string,
): AUTO_COMPLETE_SUGGESTION[] {
  return Object.keys(rec).map((word) => ({ word, category }))
}

function statswords(words: GADGET_ZSS_WORDS): AUTO_COMPLETE_SUGGESTION[] {
  return [
    ...tagwords(words.statsboard, 'stats'),
    ...tagwords(words.statshelper, 'stats'),
    ...tagwords(words.statssender, 'stats'),
    ...tagwords(words.statsinteraction, 'stats'),
    ...tagwords(words.statsboolean, 'stats'),
    ...tagwords(words.statsconfig, 'stats'),
  ]
}

function commandwords(words: GADGET_ZSS_WORDS): AUTO_COMPLETE_SUGGESTION[] {
  return [
    ...tagrecordkeys(words.langcommands, 'commands'),
    ...tagrecordkeys(words.clicommands, 'commands'),
    ...tagrecordkeys(words.loadercommands, 'commands'),
    ...tagrecordkeys(words.runtimecommands, 'commands'),
  ]
}

/** Map AUTOCOMPLETE_WORDLIST ref to tagged suggestion items. */
export function itemsfromwordlistref(
  ref: AUTOCOMPLETE_WORDLIST | AUTOCOMPLETE_WORDLIST[],
  words: GADGET_ZSS_WORDS,
): AUTO_COMPLETE_SUGGESTION[] {
  const refs = isarray(ref) ? ref : [ref]
  const out: AUTO_COMPLETE_SUGGESTION[] = []
  for (let i = 0; i < refs.length; i++) {
    const key = refs[i]
    switch (key) {
      case 'stats':
        out.push(...statswords(words))
        break
      case 'commands':
        out.push(...commandwords(words))
        break
      case 'flags':
      case 'objects':
      case 'terrains':
      case 'boards':
      case 'palettes':
      case 'charsets':
      case 'loaders':
      case 'categories':
      case 'colors':
      case 'dirs':
      case 'dirmods':
      case 'exprs':
      case 'roles':
      case 'permissionconfigs':
      case 'players':
        out.push(...tagwords(words[key], key))
        break
    }
  }
  return out
}

function resolvebranch<T>(
  meta: COMMAND_ARG_AUTOCOMPLETE | undefined,
  argindex: number,
  firstarglower: string,
  base: T[] | undefined,
  whenfirst: Record<string, T[]> | undefined,
): T | undefined {
  if (!meta) {
    return undefined
  }
  if (argindex > 0 && firstarglower && whenfirst) {
    const variant = whenfirst[firstarglower]?.[argindex]
    if (ispresent(variant)) {
      return variant
    }
  }
  return base?.[argindex]
}

/** Resolve declared keyword list for `#cmd` argument position (exported for tests). */
export function keywordsforcommandargcomplete(
  meta: COMMAND_ARG_AUTOCOMPLETE | undefined,
  argindex: number,
  firstarglower: string,
): string[] | undefined {
  if (!meta) {
    return undefined
  }
  if (argindex > 0 && firstarglower) {
    const variant = meta.whenfirst?.[firstarglower]?.[argindex]
    if (variant?.length) {
      return variant
    }
  }
  const bypos = meta.byposition?.[argindex]
  if (bypos?.length) {
    return bypos
  }
  return undefined
}

export function listsforcommandargcomplete(
  meta: COMMAND_ARG_AUTOCOMPLETE | undefined,
  argindex: number,
  firstarglower: string,
): (AUTOCOMPLETE_WORDLIST | AUTOCOMPLETE_WORDLIST[]) | undefined {
  const resolved = resolvebranch(
    meta,
    argindex,
    firstarglower,
    meta?.lists,
    meta?.listswhenfirst,
  )
  if (!ispresent(resolved)) {
    return undefined
  }
  return resolved
}

export function editorforcommandargcomplete(
  meta: COMMAND_ARG_AUTOCOMPLETE | undefined,
  argindex: number,
  firstarglower: string,
): AUTOCOMPLETE_EDITOR_SOURCE | undefined {
  return resolvebranch(
    meta,
    argindex,
    firstarglower,
    meta?.editor,
    meta?.editorwhenfirst,
  )
}

function itemsforeditorsource(
  source: AUTOCOMPLETE_EDITOR_SOURCE,
  editorctx: EDITOR_COMPLETE_CONTEXT,
): AUTO_COMPLETE_SUGGESTION[] {
  switch (source) {
    case 'labels':
      return tagwords(editorctx.labels, 'labels')
    case 'variables':
      return tagwords(editorctx.variables, 'variables')
  }
}

export function suggestionsfordirphase(
  words: GADGET_ZSS_WORDS,
  phase: DIR_COMPLETION_PHASE,
): AUTO_COMPLETE_SUGGESTION[] {
  switch (phase.kind) {
    case 'after_mod':
      return tagwords(words.dirs, 'dirs')
    case 'need_number':
      return []
    case 'need_kind':
      return tagwords(words.categories, 'categories')
    case 'need_subdir':
      return [
        ...tagwords(words.dirs, 'dirs'),
        ...tagwords(words.dirmods, 'dirmods'),
      ]
    case 'mod_or_base':
    default:
      return [
        ...tagwords(words.dirs, 'dirs'),
        ...tagwords(words.dirmods, 'dirmods'),
      ]
  }
}

function isnumericprefix(prefix: string): boolean {
  if (!prefix.length) {
    return false
  }
  const c = prefix[0]
  return c >= '0' && c <= '9'
}

export function itemsforargtype(
  words: GADGET_ZSS_WORDS,
  t: ARG_TYPE,
  prefix = '',
): AUTO_COMPLETE_SUGGESTION[] {
  switch (t) {
    case ARG_TYPE.COLOR:
      return tagwords(words.colors, 'colors')
    case ARG_TYPE.COLOR_OR_KIND:
      return [
        ...tagwords(words.colors, 'colors'),
        ...tagwords(words.categories, 'categories'),
      ]
    case ARG_TYPE.DIR:
      return [
        ...tagwords(words.dirs, 'dirs'),
        ...tagwords(words.dirmods, 'dirmods'),
      ]
    case ARG_TYPE.KIND:
    case ARG_TYPE.MAYBE_KIND:
      return tagwords(words.categories, 'categories')
    case ARG_TYPE.NUMBER:
    case ARG_TYPE.MAYBE_NUMBER:
      return []
    case ARG_TYPE.NUMBER_OR_NAME:
    case ARG_TYPE.MAYBE_NUMBER_OR_NAME:
      return isnumericprefix(prefix) ? [] : []
    case ARG_TYPE.STRING:
    case ARG_TYPE.MAYBE_STRING:
    case ARG_TYPE.NUMBER_OR_STRING:
    case ARG_TYPE.MAYBE_NUMBER_OR_STRING:
      return []
    case ARG_TYPE.NAME:
    case ARG_TYPE.MAYBE_NAME:
    case ARG_TYPE.ANY:
      return []
    default:
      return []
  }
}

export function commandargsnumeric(sig: COMMAND_ARGS_SIGNATURE): ARG_TYPE[] {
  const out: ARG_TYPE[] = []
  for (let i = 0; i < sig.length; i++) {
    const x = sig[i]
    if (typeof x === 'number') {
      out.push(x)
    }
  }
  return out
}

export type ResolveArgItemsInput = {
  words: GADGET_ZSS_WORDS
  meta: COMMAND_ARG_AUTOCOMPLETE | undefined
  argindex: number
  firstarglower: string
  maybesig: COMMAND_ARGS_SIGNATURE | undefined
  prefix: string
  editorctx?: EDITOR_COMPLETE_CONTEXT
  dirphase?: DIR_COMPLETION_PHASE
}

/** Priority chain: keywords → editor → lists → ARG_TYPE (dir phase) → empty. */
export function resolveargitems(input: ResolveArgItemsInput): AUTO_COMPLETE_SUGGESTION[] {
  const {
    words,
    meta,
    argindex,
    firstarglower,
    maybesig,
    prefix,
    editorctx,
    dirphase,
  } = input

  const keywords = keywordsforcommandargcomplete(meta, argindex, firstarglower)
  if (ispresent(keywords) && keywords.length > 0) {
    return tagwords(keywords, 'commandargmeta')
  }

  const editorsource = editorforcommandargcomplete(
    meta,
    argindex,
    firstarglower,
  )
  if (ispresent(editorsource) && ispresent(editorctx)) {
    return itemsforeditorsource(editorsource, editorctx)
  }

  const listref = listsforcommandargcomplete(meta, argindex, firstarglower)
  if (ispresent(listref)) {
    return itemsfromwordlistref(listref, words)
  }

  const types = maybesig ? commandargsnumeric(maybesig) : []
  const t = types[argindex]
  if (ispresent(t)) {
    if (t === ARG_TYPE.DIR && ispresent(dirphase)) {
      return suggestionsfordirphase(words, dirphase)
    }
    return itemsforargtype(words, t, prefix)
  }

  return []
}
