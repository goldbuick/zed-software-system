import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryreadbookflag } from 'zss/memory/bookoperations'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import type { BOOK } from 'zss/memory/types'

/**
 * Opt-in invariant: every pid on `book.activelist` must have a non-empty `board`
 * flag that resolves via `memoryreadboardbyaddress`.
 *
 * Enable in the browser devtools console:
 *   localStorage.setItem('zssDebugActivelistInvariant', '1')
 * Wired after successful `memorymoveplayertoboard` / login board assign on
 * the sim (`playermanagement.ts`) and after each `memory` hydrate on workers
 * (`memoryhydrate.ts`).
 * Optional hard fail (tests):
 *   globalThis.__ZSS_THROW_ACTIVELIST_INVARIANT = true
 *
 * ---
 * Audit (activelist / board flag mutators, repo grep):
 *
 * - **Canonical writer:** `memorywritebookplayerboard` in `playermanagement.ts`
 *   — the only runtime path that calls `memorywritebookflag(..., 'board', ...)`
 *   and mutates `book.activelist` (push when board resolves, filter when not).
 * - **Initial empty book:** `buildbookfromincoming` / book creation in
 *   `bookoperations.ts` seeds `activelist: []` (not a player mutation).
 * - **jsonsync projection:** `memorysync.ts` and `memoryhydrate.ts` replace or
 *   merge `activelist` from the wire (mirror of sim state, not a second source
 *   of truth for moves).
 * - **Reads only:** `tick.ts`, `boardrunner.ts`, `utilities.ts`, CLI
 *   `permissions.ts` — no direct `activelist` mutation.
 */
export const DEBUG_ACTIVELIST_BOARD_INVARIANT_KEY = 'zssDebugActivelistInvariant'

export function memorydebugactivelistboardinvariantenabled(): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return false
    }
    const value = localStorage.getItem(DEBUG_ACTIVELIST_BOARD_INVARIANT_KEY)
    return value === '1' || value === 'true' || value === 'yes'
  } catch {
    return false
  }
}

export function memorydebugassertactivelistboardinvariantifenabled(
  book: MAYBE<BOOK>,
): void {
  if (!memorydebugactivelistboardinvariantenabled() || !ispresent(book)) {
    return
  }
  const list = book.activelist ?? []
  const issues: string[] = []
  for (let i = 0; i < list.length; ++i) {
    const player = list[i]
    const boardaddr = memoryreadbookflag(book, player, 'board') as unknown
    if (!isstring(boardaddr) || !boardaddr) {
      issues.push(`${player}: missing or empty board flag`)
      continue
    }
    if (!ispresent(memoryreadboardbyaddress(boardaddr))) {
      issues.push(`${player}: board flag "${boardaddr}" does not resolve`)
    }
  }
  if (!issues.length) {
    return
  }
  const msg = `[zss activelist invariant] ${issues.join('; ')}`
  console.warn(msg)
  const g = globalThis as { __ZSS_THROW_ACTIVELIST_INVARIANT?: boolean }
  if (g.__ZSS_THROW_ACTIVELIST_INVARIANT) {
    throw new Error(msg)
  }
}
