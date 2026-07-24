import { objectKeys } from 'ts-extras'

import { CHIP } from './chip'
import { WORD } from './words/types'

type FIRMWARE_GET = (chip: CHIP, name: string) => [boolean, any]
type FIRMWARE_SET = (chip: CHIP, name: string, value: any) => [boolean, any]
type FIRMWARE_CYCLE = (chip: CHIP) => void
type FIRMWARE_LIST = () => string[]

export type FIRMWARE_COMMAND = (chip: CHIP, words: WORD[]) => 0 | 1

/** One argument signature: zero or more ARG_TYPE (number) followed by a string (e.g. description). */
export type COMMAND_ARGS_SIGNATURE = [...number[], string]

/** VM word-list pool keys for autocomplete (GADGET_ZSS_WORDS fields + synthetic merges). */
export type AUTOCOMPLETE_WORDLIST =
  | 'flags'
  | 'objects'
  | 'terrains'
  | 'boards'
  | 'palettes'
  | 'charsets'
  | 'loaders'
  | 'categories'
  | 'colors'
  | 'dirs'
  | 'dirmods'
  | 'exprs'
  | 'stats'
  | 'commands'
  | 'roles'
  | 'permissionconfigs'
  | 'players'

export type AUTOCOMPLETE_EDITOR_SOURCE = 'labels' | 'variables'

/**
 * Optional tape autocomplete metadata per `#` command (firmware-adjacent).
 * `whenfirst` covers first-token peek variants; broader `wordsSoFar` dispatch can extend this type later.
 */
export type COMMAND_ARG_AUTOCOMPLETE = {
  /** Arg index 0 = first token after command name. */
  byposition?: string[][]
  /** When first arg matches key (lowercase NAME), use per-arg keyword lists at each index. */
  whenfirst?: Record<string, string[][]>
  /** Per-arg VM list refs (single key or merged array). */
  lists?: (AUTOCOMPLETE_WORDLIST | AUTOCOMPLETE_WORDLIST[] | undefined)[]
  listswhenfirst?: Record<
    string,
    (AUTOCOMPLETE_WORDLIST | AUTOCOMPLETE_WORDLIST[] | undefined)[]
  >
  /** Per-arg editor-local pools (editor only; ignored in terminal). */
  editor?: (AUTOCOMPLETE_EDITOR_SOURCE | undefined)[]
  editorwhenfirst?: Record<
    string,
    (AUTOCOMPLETE_EDITOR_SOURCE | undefined)[]
  >
}

export type FIRMWARE_EVENTS = {
  get?: FIRMWARE_GET
  set?: FIRMWARE_SET
  everytick?: FIRMWARE_CYCLE
  aftertick?: FIRMWARE_CYCLE
  list?: FIRMWARE_LIST
}

/** Required role for permission check: operator | admin | mod | player. Default 'player'. */
export type COMMAND_REQUIRED_ROLE = 'operator' | 'admin' | 'mod' | 'player'

export type FIRMWARE = {
  get?: FIRMWARE_GET
  set?: FIRMWARE_SET
  everytick: FIRMWARE_CYCLE
  aftertick: FIRMWARE_CYCLE
  getcommand: (name: string) => FIRMWARE_COMMAND | undefined
  getcommandargs: (name: string) => COMMAND_ARGS_SIGNATURE | undefined
  getcommandargmeta: (name: string) => COMMAND_ARG_AUTOCOMPLETE | undefined
  command: (
    name: string,
    args: COMMAND_ARGS_SIGNATURE,
    func: FIRMWARE_COMMAND,
    argmeta?: COMMAND_ARG_AUTOCOMPLETE,
  ) => FIRMWARE
  listcommands: () => string[]
}

export function createfirmware(events?: FIRMWARE_EVENTS): FIRMWARE {
  const commands: Record<string, FIRMWARE_COMMAND> = {}
  const commandArgs: Record<string, COMMAND_ARGS_SIGNATURE> = {}
  const commandArgMeta: Record<string, COMMAND_ARG_AUTOCOMPLETE> = {}

  const firmware: FIRMWARE = {
    everytick() {},
    aftertick() {},
    listcommands() {
      return objectKeys(commands)
    },
    ...events,
    getcommand(name) {
      return commands[name]
    },
    getcommandargs(name) {
      return commandArgs[name]
    },
    getcommandargmeta(name) {
      return commandArgMeta[name]
    },
    command(name, args, func, argmeta): FIRMWARE {
      commands[name] = func
      commandArgs[name] = args
      if (argmeta !== undefined) {
        commandArgMeta[name] = argmeta
      }
      return firmware
    },
  }

  return firmware
}
