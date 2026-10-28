import * as lexer from 'zss/feature/lang/lexer'
import {
  SYNTH_NAMED_TYPES,
  validatesynthtype,
} from 'zss/feature/synth/voiceconfig/validation'
import {
  SYNTH_NAMED_VOICE_CONFIG,
  SYNTH_OSC_CONFIG_KEYWORDS,
  SYNTH_WAVE_COMMAND_NAMES,
} from 'zss/firmware/autocompleteconstants'
import { NAME } from 'zss/words/types'

import { EDITOR_CODE_ROW } from './common'

/** Last selected type or wave for each `#synth` target, from source above the cursor. */
export type SYNTH_VOICE_SLOTS = {
  /** Bare `#synth` — play voices 0-3. */
  play: string
  v1: string
  v2: string
  v3: string
  v4: string
  /** `#synth5` — bgplay. */
  bg: string
}

function emptyslots(): SYNTH_VOICE_SLOTS {
  return {
    play: '',
    v1: '',
    v2: '',
    v3: '',
    v4: '',
    bg: '',
  }
}

const PLAY_OVERRIDE_KEYS = ['v1', 'v2', 'v3', 'v4'] as const

type SLOT_KEY = keyof SYNTH_VOICE_SLOTS

const COMMAND_SLOT: Record<string, SLOT_KEY> = {
  synth: 'play',
  synth1: 'v1',
  synth2: 'v2',
  synth3: 'v3',
  synth4: 'v4',
  synth5: 'bg',
}

function dedupekeywords(words: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (let i = 0; i < words.length; ++i) {
    const word = words[i]
    if (seen.has(word)) {
      continue
    }
    seen.add(word)
    out.push(word)
  }
  return out
}

function configkeysforvoice(voice: string): readonly string[] {
  const named = SYNTH_NAMED_VOICE_CONFIG[voice]
  if (named) {
    return named
  }
  return SYNTH_OSC_CONFIG_KEYWORDS
}

/** Voice and wave names, then the keys for the voice already selected. */
export function synthfirstargkeywords(voice: string): string[] {
  return dedupekeywords([
    ...SYNTH_NAMED_TYPES,
    ...SYNTH_WAVE_COMMAND_NAMES,
    ...configkeysforvoice(voice),
  ])
}

function issynthvoiceselect(word: string): boolean {
  // Empty partials array accepts `fmsquare8`-style names as a type select.
  return validatesynthtype(word, [])
}

function applysynthline(slots: SYNTH_VOICE_SLOTS, command: string, arg: string) {
  const slot = COMMAND_SLOT[command]
  if (!slot || !arg) {
    return
  }
  if (arg === 'restart') {
    slots[slot] = ''
    if (slot === 'play') {
      for (let i = 0; i < PLAY_OVERRIDE_KEYS.length; ++i) {
        slots[PLAY_OVERRIDE_KEYS[i]] = ''
      }
    }
    return
  }
  if (!issynthvoiceselect(arg)) {
    return
  }
  slots[slot] = arg
  // Bare `#synth <name>` writes play voices 0-3, so earlier per-voice overrides are stale.
  if (slot === 'play') {
    for (let i = 0; i < PLAY_OVERRIDE_KEYS.length; ++i) {
      slots[PLAY_OVERRIDE_KEYS[i]] = ''
    }
  }
}

function firstargsaftercommands(row: EDITOR_CODE_ROW): { command: string; arg: string }[] {
  const tokens = row.tokens
  if (!tokens?.length) {
    return []
  }
  const found: { command: string; arg: string }[] = []
  for (let t = 0; t < tokens.length; ++t) {
    if (tokens[t].tokenTypeIdx !== lexer.command.tokenTypeIdx) {
      continue
    }
    const command = NAME(tokens[t + 1]?.image ?? '')
    const arg = NAME(tokens[t + 2]?.image ?? '')
    if (!COMMAND_SLOT[command]) {
      continue
    }
    found.push({ command, arg })
  }
  return found
}

/**
 * Walk rows above `cursorrow` in source order.
 * The line being typed is not a prior selection.
 */
export function infersynthslots(
  rows: EDITOR_CODE_ROW[],
  cursorrow: number,
): SYNTH_VOICE_SLOTS {
  const slots = emptyslots()
  const last = Math.min(cursorrow, rows.length)
  for (let r = 0; r < last; ++r) {
    const lines = firstargsaftercommands(rows[r])
    for (let i = 0; i < lines.length; ++i) {
      applysynthline(slots, lines[i].command, lines[i].arg)
    }
  }
  return slots
}

/** Voice used to scope `#synth` / `#synth1`–`#synth5` config-key suggestions. */
export function inferredvoiceforcommand(
  slots: SYNTH_VOICE_SLOTS,
  command: string,
): string | undefined {
  const slot = COMMAND_SLOT[command]
  if (!slot) {
    return undefined
  }
  if (slots[slot]) {
    return slots[slot]
  }
  if (slot !== 'play' && slot !== 'bg' && slots.play) {
    return slots.play
  }
  return undefined
}
