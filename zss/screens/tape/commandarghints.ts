import { MAYBE, ispresent } from 'zss/mapping/types'
import { romread } from 'zss/rom'
import { romhintfrommarkdown } from 'zss/rom/romhint'

const COMMAND_ROM_HINT_CACHE = new Map<string, string>()

/** Clears cached command ROM hints (e.g. if ROM content can hot-reload). */
export function clearcommandromhintcache() {
  COMMAND_ROM_HINT_CACHE.clear()
}

/**
 * Channel variants (#synth1, #echo3, #fmsquare5, #algo05) share the bare command ROM.
 * Trailing digit 1-5 only (matches synth1-5 / FX1-4 / voice-config 1-5).
 */
function commandromlookupkeys(key: string): string[] {
  const keys = [key]
  const match = /^(.+)([1-5])$/.exec(key)
  if (match?.[1]) {
    keys.push(match[1])
  }
  return keys
}

function readcommandromhint(key: string): string {
  for (const lookup of commandromlookupkeys(key)) {
    const rom: MAYBE<string> = romread(`editor:commands:${lookup}`)
    if (ispresent(rom)) {
      return romhintfrommarkdown(rom) ?? ''
    }
  }
  return ''
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
  const hint = readcommandromhint(key)
  COMMAND_ROM_HINT_CACHE.set(key, hint)
  return hint
}
