import { MAYBE, ispresent } from 'zss/mapping/types'
import { romhintfrommarkdown, romread } from 'zss/rom'

const COMMAND_ROM_HINT_CACHE = new Map<string, string>()

/** Clears cached command ROM hints (e.g. if ROM content can hot-reload). */
export function clearcommandromhintcache() {
  COMMAND_ROM_HINT_CACHE.clear()
}

/** Longer help from `zss/rom/editor/commands/<name>.md` when present. Cached per command key. */
export function commandromhint(commandlookup: string): string {
  if (!commandlookup) {
    return ''
  }
  const key = commandlookup.toLowerCase()
  if (COMMAND_ROM_HINT_CACHE.has(key)) {
    return COMMAND_ROM_HINT_CACHE.get(key) ?? ''
  }
  const rom: MAYBE<string> = romread(`editor:commands:${key}`)
  const hint = ispresent(rom) ? (romhintfrommarkdown(rom) ?? '') : ''
  COMMAND_ROM_HINT_CACHE.set(key, hint)
  return hint
}
