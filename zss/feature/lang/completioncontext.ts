import type { IToken } from 'chevrotain'
import type { COMMAND_ARGS_SIGNATURE } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

function commandargsnumeric(sig: COMMAND_ARGS_SIGNATURE): ARG_TYPE[] {
  const out: ARG_TYPE[] = []
  for (let i = 0; i < sig.length; i++) {
    const x = sig[i]
    if (typeof x === 'number') {
      out.push(x)
    }
  }
  return out
}

export type DIR_COMPLETION_PHASE =
  | { kind: 'mod_or_base' }
  | { kind: 'after_mod' }
  | { kind: 'need_number' }
  | { kind: 'need_kind' }
  | { kind: 'need_subdir' }

export type COMPLETION_ARG_CONTEXT = {
  commandname: string
  argslot: number
  argtype: ARG_TYPE | undefined
  dirphase?: DIR_COMPLETION_PHASE
  firstarglower: string
}

export const DIR_MOD_CONTINUES = new Set([
  'cw',
  'ccw',
  'opp',
  'oop',
  'rndp',
  'over',
  'under',
  'ground',
  'elements',
  'flood',
  'beam',
  'within',
  'awayby',
])

export const DIR_NEED_PAIR = new Set(['by', 'at', 'away', 'toward'])
export const DIR_NEED_KIND = new Set(['find', 'flee'])
export const DIR_NEED_SUBDIR = new Set(['to'])

/** Normalize token images for readargs (oop alias, lowercase names). */
export function wordimagesforreadargs(tokens: IToken[]): string[] {
  return tokens.map((token) => {
    const raw = token.image ?? ''
    const lower = NAME(raw).toLowerCase()
    if (lower === 'oop') {
      return 'opp'
    }
    return raw
  })
}

function tryadvanceslot(
  words: string[],
  index: number,
  argtype: ARG_TYPE,
): number | undefined {
  READ_CONTEXT.words = words
  try {
    const [, next] = readargs(words, index, [argtype])
    return next
  } catch {
    return undefined
  }
}

function wordlower(words: string[], index: number): string {
  return NAME(words[index] ?? '').toLowerCase()
}

/** Infer dir completion phase from tokens between dirstart and cursor (inclusive). */
export function resolvedirphase(
  words: string[],
  dirstart: number,
  cursortokenidx: number,
): DIR_COMPLETION_PHASE {
  if (cursortokenidx < dirstart) {
    return { kind: 'mod_or_base' }
  }

  let ii = dirstart
  let pendingmod = false
  while (ii < cursortokenidx) {
    const w = wordlower(words, ii)
    if (DIR_NEED_PAIR.has(w)) {
      pendingmod = false
      ii++
      while (ii < cursortokenidx && isnumericword(words[ii])) {
        ii++
      }
      continue
    }
    if (w === 'within' || w === 'awayby') {
      pendingmod = false
      ii++
      if (ii < cursortokenidx && isnumericword(words[ii])) {
        ii++
      }
      continue
    }
    if (DIR_NEED_KIND.has(w)) {
      return { kind: 'need_kind' }
    }
    if (DIR_NEED_SUBDIR.has(w)) {
      return { kind: 'need_subdir' }
    }
    if (w === 'beam') {
      ii++
      if (ii <= cursortokenidx && isnumericword(words[ii])) {
        ii++
      }
      if (ii <= cursortokenidx) {
        return { kind: 'need_subdir' }
      }
      return { kind: 'need_number' }
    }
    if (w === 'select') {
      return { kind: 'need_kind' }
    }
    if (DIR_MOD_CONTINUES.has(w)) {
      pendingmod = true
      ii++
      continue
    }
    pendingmod = false
    ii++
  }

  const cur = wordlower(words, cursortokenidx)
  if (pendingmod) {
    return { kind: 'after_mod' }
  }
  if (DIR_NEED_PAIR.has(cur) || cur === 'within' || cur === 'awayby') {
    return { kind: 'need_number' }
  }
  if (DIR_NEED_KIND.has(cur) || cur === 'select') {
    return { kind: 'need_kind' }
  }
  if (DIR_NEED_SUBDIR.has(cur)) {
    return { kind: 'need_subdir' }
  }
  if (cur === 'beam') {
    return { kind: 'need_number' }
  }
  return { kind: 'mod_or_base' }
}

function isnumericword(word: string | undefined): boolean {
  if (!ispresent(word)) {
    return false
  }
  const n = parseFloat(word)
  return !Number.isNaN(n)
}

export function resolveargslot(
  tokens: IToken[],
  cmdidx: number,
  activetokenidx: number,
  maybesig: COMMAND_ARGS_SIGNATURE | undefined,
): Pick<
  COMPLETION_ARG_CONTEXT,
  'argslot' | 'argtype' | 'dirphase' | 'firstarglower'
> {
  const types = maybesig ? commandargsnumeric(maybesig) : []
  const words = wordimagesforreadargs(tokens)

  let firstarglower = ''
  if (cmdidx + 2 < tokens.length) {
    firstarglower = NAME(tokens[cmdidx + 2]?.image ?? '').toLowerCase()
  }

  if (activetokenidx <= cmdidx + 1 || types.length === 0) {
    return { argslot: -1, argtype: undefined, firstarglower }
  }

  let slot = 0
  let ii = cmdidx + 2
  while (slot < types.length) {
    if (activetokenidx < ii) {
      const argtype = types[slot]
      const dirphase =
        argtype === ARG_TYPE.DIR
          ? resolvedirphase(words, ii, activetokenidx)
          : undefined
      return { argslot: slot, argtype, dirphase, firstarglower }
    }

    const next = tryadvanceslot(words, ii, types[slot])
    if (next === undefined) {
      const argtype = types[slot]
      const dirphase =
        argtype === ARG_TYPE.DIR
          ? resolvedirphase(words, ii, activetokenidx)
          : undefined
      return { argslot: slot, argtype, dirphase, firstarglower }
    }

    if (activetokenidx < next) {
      const argtype = types[slot]
      const dirphase =
        argtype === ARG_TYPE.DIR
          ? resolvedirphase(words, ii, activetokenidx)
          : undefined
      return { argslot: slot, argtype, dirphase, firstarglower }
    }

    ii = next
    slot++
  }

  return { argslot: slot, argtype: undefined, firstarglower }
}

export function resolvecompletionargcontext(
  tokens: IToken[],
  cmdidx: number,
  activetokenidx: number,
  maybesig: COMMAND_ARGS_SIGNATURE | undefined,
): COMPLETION_ARG_CONTEXT | undefined {
  if (cmdidx < 0) {
    return undefined
  }
  const commandname = NAME(tokens[cmdidx + 1]?.image ?? '').toLowerCase()
  const slotinfo = resolveargslot(tokens, cmdidx, activetokenidx, maybesig)
  if (slotinfo.argslot < 0) {
    return undefined
  }
  return {
    commandname,
    argslot: slotinfo.argslot,
    argtype: slotinfo.argtype,
    dirphase: slotinfo.dirphase,
    firstarglower: slotinfo.firstarglower,
  }
}
