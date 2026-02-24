import { useMemo } from 'react'
import { useGadgetClient } from 'zss/gadget/data/state'
import { useShallow } from 'zustand/react/shallow'

import type { AUTOCOMPLETE_WORDS } from './autocomplete'

const EMPTY_ZSS_WORDS: ZSS_WORDS = {
  cli: [],
  loader: [],
  runtime: [],
  flags: [],
  statsboard: [],
  statshelper: [],
  statssender: [],
  statsinteraction: [],
  statsboolean: [],
  statsconfig: [],
  statsrunwith: [],
  kinds: [],
  altkinds: [],
  colors: [],
  dirs: [],
  dirmods: [],
  exprs: [],
}

export type ZSS_WORDS = {
  cli: string[]
  loader: string[]
  runtime: string[]
  flags: string[]
  statsboard: string[]
  statshelper: string[]
  statssender: string[]
  statsinteraction: string[]
  statsboolean: string[]
  statsconfig: string[]
  statsrunwith: string[]
  kinds: string[]
  altkinds: string[]
  colors: string[]
  dirs: string[]
  dirmods: string[]
  exprs: string[]
}

export const STRUCTURED_COMMANDS = [
  'if',
  'try',
  'take',
  'give',
  'duplicate',
  'do',
  'done',
  'else',
  'while',
  'repeat',
  'waitfor',
  'foreach',
  'for',
  'break',
  'continue',
] as const

export const SPECIAL_COMMANDS = [
  'toast',
  'ticker',
  'play',
  'bgplay',
  'bgplayon64n',
  'bgplayon32n',
  'bgplayon16n',
  'bgplayon8n',
  'bgplayon4n',
  'bgplayon2n',
  'bgplayon1n',
] as const

const STRUCTURED_SET = new Set(STRUCTURED_COMMANDS)

export type ZSS_WORD_COLOR_MAP = {
  command: number
  flag: number
  stat: number
  kind: number
  kindalt: number
  color: number
  dir: number
  dirmod: number
  exprs: number
}

/** Build word -> color (or token type) map from normalized words and category colors. */
export function buildwordcolormap(
  words: ZSS_WORDS,
  colors: ZSS_WORD_COLOR_MAP,
): Map<string, number> {
  const map = new Map<string, number>()
  const { command, flag, stat, kind, kindalt, color, dir, dirmod, exprs } =
    colors
  for (const w of STRUCTURED_COMMANDS) {
    map.set(w, command)
  }
  for (const w of SPECIAL_COMMANDS) {
    map.set(w, command)
  }
  for (const w of words.cli) {
    map.set(w, command)
  }
  for (const w of words.loader) {
    map.set(w, command)
  }
  for (const w of words.runtime) {
    map.set(w, command)
  }
  for (const w of words.flags) {
    map.set(w, flag)
  }
  for (const w of words.statsboard) {
    map.set(w, stat)
  }
  for (const w of words.statshelper) {
    map.set(w, stat)
  }
  for (const w of words.statssender) {
    map.set(w, stat)
  }
  for (const w of words.statsinteraction) {
    map.set(w, stat)
  }
  for (const w of words.statsboolean) {
    map.set(w, stat)
  }
  for (const w of words.statsconfig) {
    map.set(w, stat)
  }
  for (const w of words.statsrunwith) {
    map.set(w, stat)
  }
  for (const w of words.kinds) {
    map.set(w, kind)
  }
  for (const w of words.altkinds) {
    map.set(w, kindalt)
  }
  for (const w of words.colors) {
    map.set(w, color)
  }
  for (const w of words.dirs) {
    map.set(w, dir)
  }
  for (const w of words.dirmods) {
    map.set(w, dirmod)
  }
  for (const w of words.exprs) {
    map.set(w, exprs)
  }
  return map
}

export type UseZssWordsOptions = {
  /** Include loader commands in command set (editor loader codepage). */
  isLoader?: boolean
  /** Include CLI commands (e.g. for terminal #command autocomplete). */
  isCli?: boolean
}

export type UseZssWordsResult = {
  /** Normalized word arrays from gadget state. */
  words: ZSS_WORDS
  /** Set of lowercased command names (for label shadow check in editor). */
  commandnames: Set<string>
  /** Command words for autocomplete (runtime + optional loader + structured + special). */
  commandwords: string[]
  /** Stat words minus flags. */
  statwords: string[]
  /** All known words (commands + flags + stats + kinds + colors + dirs + exprs). */
  allwords: string[]
  /** Words per category for autocomplete (command, flag, stat, kind, color, dir, dirmod, expr). */
  autocompleteWords: AUTOCOMPLETE_WORDS
}

export function useZssWords(
  options: UseZssWordsOptions = {},
): UseZssWordsResult {
  const { isLoader = false, isCli = false } = options
  const raw = useGadgetClient(useShallow((state) => state.zsswords))
  const words = useMemo(() => {
    const z = raw as Record<string, string[] | undefined> | undefined
    if (!z) {
      return EMPTY_ZSS_WORDS
    }
    const arr = (k: string) => z[k] ?? []
    return {
      cli: arr('cli'),
      loader: arr('loader'),
      runtime: arr('runtime'),
      flags: arr('flags'),
      statsboard: arr('statsboard'),
      statshelper: arr('statshelper'),
      statssender: arr('statssender'),
      statsinteraction: arr('statsinteraction'),
      statsboolean: arr('statsboolean'),
      statsconfig: arr('statsconfig'),
      statsrunwith: arr('statsrunwith'),
      kinds: arr('kinds'),
      altkinds: arr('altkinds'),
      colors: arr('colors'),
      dirs: arr('dirs'),
      dirmods: arr('dirmods'),
      exprs: arr('exprs'),
    }
  }, [raw])

  const commandnames = useMemo(() => {
    const names = new Set<string>(STRUCTURED_SET)
    for (const word of words.cli) {
      names.add(word.toLowerCase())
    }
    for (const word of words.loader) {
      names.add(word.toLowerCase())
    }
    for (const word of words.runtime) {
      names.add(word.toLowerCase())
    }
    return names
  }, [words.cli, words.loader, words.runtime])

  const commandwords = useMemo(() => {
    const set = new Set<string>()
    if (isLoader) {
      for (const w of words.loader) {
        set.add(w)
      }
    }
    if (isCli) {
      for (const w of words.cli) {
        set.add(w)
      }
    }
    for (const w of words.runtime) {
      set.add(w)
    }
    for (const w of STRUCTURED_COMMANDS) {
      set.add(w)
    }
    for (const w of SPECIAL_COMMANDS) {
      set.add(w)
    }
    return Array.from(set)
  }, [isLoader, isCli, words.loader, words.cli, words.runtime])

  const statwords = useMemo(() => {
    const flagset = new Set(words.flags.map((w) => w.toLowerCase()))
    return [
      ...words.statsboard,
      ...words.statshelper,
      ...words.statssender,
      ...words.statsinteraction,
      ...words.statsboolean,
      ...words.statsconfig,
      ...words.statsrunwith,
    ].filter((w) => !flagset.has(w.toLowerCase()))
  }, [
    words.statsboard,
    words.statshelper,
    words.statssender,
    words.statsinteraction,
    words.statsboolean,
    words.statsconfig,
    words.statsrunwith,
    words.flags,
  ])

  const allwords = useMemo(() => {
    const set = new Set(commandwords)
    for (const w of words.flags) {
      set.add(w)
    }
    for (const w of words.statsboard) {
      set.add(w)
    }
    for (const w of words.statshelper) {
      set.add(w)
    }
    for (const w of words.statssender) {
      set.add(w)
    }
    for (const w of words.statsinteraction) {
      set.add(w)
    }
    for (const w of words.statsboolean) {
      set.add(w)
    }
    for (const w of words.statsconfig) {
      set.add(w)
    }
    for (const w of words.statsrunwith) {
      set.add(w)
    }
    for (const w of words.kinds) {
      set.add(w)
    }
    for (const w of words.altkinds) {
      set.add(w)
    }
    for (const w of words.colors) {
      set.add(w)
    }
    for (const w of words.dirs) {
      set.add(w)
    }
    for (const w of words.dirmods) {
      set.add(w)
    }
    for (const w of words.exprs) {
      set.add(w)
    }
    return Array.from(set)
  }, [
    commandwords,
    words.flags,
    words.statsboard,
    words.statshelper,
    words.statssender,
    words.statsinteraction,
    words.statsboolean,
    words.statsconfig,
    words.statsrunwith,
    words.kinds,
    words.altkinds,
    words.colors,
    words.dirs,
    words.dirmods,
    words.exprs,
  ])

  const autocompleteWords = useMemo((): AUTOCOMPLETE_WORDS => ({
    command: commandwords,
    flag: words.flags,
    stat: statwords,
    kind: [...words.kinds, ...words.altkinds],
    color: words.colors,
    dir: words.dirs,
    dirmod: words.dirmods,
    expr: words.exprs,
  }), [
    commandwords,
    statwords,
    words.flags,
    words.kinds,
    words.altkinds,
    words.colors,
    words.dirs,
    words.dirmods,
    words.exprs,
  ])

  return {
    words,
    commandnames,
    commandwords,
    statwords,
    allwords,
    autocompleteWords,
  }
}
