import Alea from 'alea'
import humanid from 'human-id'
import { customAlphabet, nanoid } from 'nanoid'
import { lowercase, numbers } from 'nanoid-dictionary'

import { MAYBE } from './types'

const SID_CHARS = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_',
  12,
)

export function createsid() {
  return `sid_${SID_CHARS()}`
}

export function issid(id: MAYBE<string>): id is string {
  return typeof id === 'string' && id.startsWith('sid_')
}

/** True when `id` is safe as a single path segment / `{id}.json` stem. */
export function isfilenamesafeid(id: string): boolean {
  if (!id) {
    return false
  }
  if (id.includes('.') || id.includes('/') || id.includes('\\')) {
    return false
  }
  return true
}

/**
 * Deterministic filename-safe rewrite: `.` → `_`.
 * When `taken` is provided, append `_1`, `_2`, … until the candidate is unique.
 */
export function sanitizesidid(id: string, taken?: Set<string>): string {
  if (isfilenamesafeid(id)) {
    return id
  }
  const base = id.replaceAll('.', '_')
  if (!taken) {
    return base
  }
  let candidate = base
  let n = 0
  while (taken.has(candidate)) {
    n += 1
    candidate = `${base}_${n}`
  }
  return candidate
}

const JUST_NUMBER_CHARS = customAlphabet(numbers, 4)
const MIXED_CHARS = customAlphabet(`${numbers}${lowercase}`, 16)

export function createpid() {
  return `pid_${JUST_NUMBER_CHARS()}_${MIXED_CHARS()}`
}

export function createtopic() {
  return nanoid()
}

export function ispid(id: MAYBE<string>): id is string {
  return typeof id === 'string' && id.startsWith('pid_')
}

export function createnameid() {
  return humanid({
    capitalize: false,
    adjectiveCount: 1,
  })
}

export function createshortnameid() {
  return humanid({
    addAdverb: false,
    capitalize: false,
    adjectiveCount: 0,
  })
}

const PEER_ID_LENGTH = 20
const HEX_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function createinfohash(source: string): string {
  const rng = Alea(source)
  const chars: string[] = []
  for (let i = 0; i < PEER_ID_LENGTH; ++i) {
    chars.push(HEX_CHARS[Math.floor(rng() * HEX_CHARS.length)])
  }
  return chars.join('')
}

export function createchipid(chip: string) {
  return `${chip}_chip`
}

export function createsynthid(board: string) {
  return `${board}_synth`
}

export function createlayersid(board: string) {
  return `${board}_layers`
}

export function createtrackingid(board: string) {
  return `${board}_tracking`
}

export function creategadgetid(player: string) {
  return `${player}_gadget`
}
