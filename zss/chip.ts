import ErrorStackParser from 'error-stack-parser'

import { RUNTIME } from './config'
import { MESSAGE, apierror } from './device/api'
import { SOFTWARE } from './device/session'
import {
  DRIVER_TYPE,
  firmwareaftertick,
  firmwareeverytick,
  firmwareget,
  firmwaregetcommand,
  firmwareset,
} from './firmware/runner'
import { GeneratorBuild, GeneratorFunc } from './lang/generator'
import { GENERATED_FILENAME } from './lang/transformer'
import {
  MAYBE,
  deepcopy,
  isarray,
  isequal,
  isnumber,
  ispresent,
} from './mapping/types'
import { maptonumber, maptostring } from './mapping/value'
import { memoryclearflags, memoryreadflags } from './memory'
import { ARG_TYPE, READ_CONTEXT, readargs } from './words/reader'
import { MaybeFlag, tokenize } from './words/textformat'
import { NAME, WORD, WORD_RESULT } from './words/types'

/**
 * CHIP represents a virtual machine instance that executes compiled code.
 * It provides APIs for lifecycle management, state management, messaging,
 * control flow, and logic operations. May need to expand on this to encapsulate more complex values.
 */
export type CHIP = {
  /**
   * Halts the chip and clears all memory flags.
   */
  halt: () => void

  /**
   * Returns the unique identifier of this chip.
   * @returns The chip's ID string
   */
  id: () => string

  /**
   * Sets a named state value in the chip's memory.
   * @param name - The name of the state variable
   * @param value - The value to set
   * @returns The result value if the set operation succeeded, undefined otherwise
   */
  set: (name: string, value: any) => any

  /**
   * Gets a named state value from the chip's memory.
   * @param name - The name of the state variable
   * @returns The value if found, undefined otherwise
   */
  get: (name: string) => any

  /**
   * Executes one cycle of the chip's logic. Resets loop counter and yield state,
   * then invokes the compiled generator function.
   */
  once: () => void

  /**
   * Executes a tick of the chip's execution cycle. Handles execution frequency,
   * runs firmware hooks, and executes the chip logic if conditions are met.
   * @param cycle - The cycle number for frequency calculation
   * @returns True if the chip executed this tick, false otherwise
   */
  tick: (cycle: number) => boolean

  /**
   * Checks if the chip is in an ended state.
   * @returns True if the chip has ended execution
   */
  isended: () => boolean

  /**
   * Checks if this is the first pulse/cycle of execution.
   * @returns True if this is the first pulse
   */
  isfirstpulse: () => boolean

  /**
   * Determines if the chip should execute this tick.
   * @returns True if the chip should tick (not scroll-locked and either not ended or has pending messages)
   */
  shouldtick: () => boolean

  /**
   * Checks the loop counter to prevent infinite loops. Increments counter and
   * returns true if the counter exceeds the yield threshold.
   * @returns True if the loop count exceeds the yield threshold
   */
  checkcount: () => boolean

  /**
   * Checks if the chip has an active (unzapped) label with the given name.
   * @param label - The label name to check
   * @returns True if an active label exists
   */
  haslabel: (label: string) => boolean

  /**
   * Returns the line number of the first active label matching the pending message target.
   * @returns The line number if a matching label is found, 0 otherwise
   */
  hm: () => number

  /**
   * Yields execution, pausing the chip until the next tick.
   */
  yield: () => void

  /**
   * Jumps execution to a specific line number.
   * @param line - The line number to jump to
   */
  jump: (line: number) => void

  /**
   * Checks if the chip should yield (either explicitly yielded or loop count exceeded).
   * @returns True if the chip should yield
   */
  sy: () => boolean

  /**
   * Sends a message to another chip.
   * @param player - The player identifier
   * @param chipid - The target chip ID
   * @param message - The message name
   * @param data - Optional message data
   */
  send: (player: string, chipid: string, message: string, data?: any) => void

  /**
   * Locks the chip to only accept messages from the specified sender.
   * @param allowed - The allowed sender ID
   */
  lock: (allowed: string) => void

  /**
   * Unlocks the chip, allowing messages from any sender.
   */
  unlock: () => void

  /**
   * Locks the chip's scroll to a specific player, preventing execution until unlocked.
   * @param player - The player identifier to lock to
   */
  scrolllock: (player: string) => void

  /**
   * Unlocks the chip's scroll for a specific player.
   * @param player - The player identifier to unlock
   */
  scrollunlock: (player: string) => void

  /**
   * Processes an incoming message. Validates locks and stores the message if valid.
   * @param incoming - The incoming message object
   */
  message: (incoming: MESSAGE) => void

  /**
   * Zaps (deactivates) the first active label with the given name by negating its line number.
   * @param label - The label name to zap
   */
  zap: (label: string) => void

  /**
   * Restores all zapped labels with the given name by making their line numbers positive again.
   * @param label - The label name to restore
   */
  restore: (label: string) => void

  /**
   * Gets the current execution case (line number). Processes pending messages if any,
   * updating chip state and execution cursor accordingly.
   * @returns The current execution cursor line number
   */
  getcase: () => number

  /**
   * Advances to the next execution case by incrementing the execution cursor.
   * @returns The new execution cursor line number
   */
  nextcase: () => void

  /**
   * Marks the chip as ended and yields execution.
   */
  endofprogram: () => void

  /**
   * Parses an error stack trace and returns the line/column information from the generated code.
   * @param error - The error object to parse
   * @returns An object with line and column numbers, or zeros if not found
   */
  stacktrace: (error: Error) => void

  /**
   * Outputs text to the display.
   * @param words - The words to output as text
   */
  text: (...words: WORD[]) => void

  /**
   * Outputs a stat to the display.
   * @param words - The words to output as a stat
   */
  stat: (...words: WORD[]) => void

  /**
   * Outputs a hyperlink to the display.
   * @param words - The words to output as a hyperlink
   */
  hyperlink: (...words: WORD[]) => void

  /**
   * Formats a value for printing/display.
   * @param name - The value to print
   * @returns A formatted string representation of the value
   */
  print: (name: string) => string

  /**
   * Processes a template string, replacing variables (prefixed with special characters) with their values.
   * @param words - The words to process as a template
   * @returns The processed template string
   */
  template: (words: WORD[]) => string

  /**
   * Executes a command by name with the given arguments.
   * @param words - Command name followed by arguments
   * @returns 0 to continue, 1 to retry
   */
  command: (...words: WORD[]) => WORD_RESULT

  /**
   * Conditional execution: executes the command if the condition is truthy.
   * @param words - Condition value followed by command words
   * @returns 1 if condition was truthy, 0 otherwise
   */
  if: (...words: WORD[]) => WORD_RESULT

  /**
   * Tries to execute a movement command, then executes the fallback command if successful.
   * @param words - Direction followed by fallback command words
   * @returns 1 if movement succeeded, 0 otherwise
   */
  try: (...words: WORD[]) => WORD_RESULT

  /**
   * Decrements a named value. Executes fail branch if value is unset, non-numeric, or would go negative.
   * @param words - Variable name, optional decrement amount, and optional fail branch command
   * @returns 1 if take failed, 0 if successful
   */
  take: (...words: WORD[]) => WORD_RESULT

  /**
   * Increments a named value. Executes fail branch if value is unset.
   * @param words - Variable name, optional increment amount, and optional fail branch command
   * @returns 1 if value was unset, 0 otherwise
   */
  give: (...words: WORD[]) => WORD_RESULT

  /**
   * Executes the duplicate command.
   * @param words - Command arguments
   * @returns The command result
   */
  duplicate: (...words: WORD[]) => WORD_RESULT

  /**
   * Initializes a repeat loop with the given count and command words.
   * @param index - The unique index for this repeat loop
   * @param words - Repeat count followed by command words to repeat
   */
  repeatstart: (index: number, ...words: WORD[]) => void

  /**
   * Executes one iteration of a repeat loop. Decrements counter and executes commands if count > 0.
   * @param index - The unique index of the repeat loop
   * @returns 1 if loop continues, 0 if loop is complete
   */
  repeat: (index: number) => WORD_RESULT

  /**
   * Initializes a foreach loop. Supports array iteration or numeric range iteration.
   * @param index - The unique index for this foreach loop (unused)
   * @param words - Variable name, array/range values, and optional step for numeric ranges
   * @returns 0
   */
  foreachstart: (index: number, ...words: WORD[]) => WORD_RESULT

  /**
   * Executes one iteration of a foreach loop. Advances to next value and executes command if available.
   * @param index - The unique index of the foreach loop (unused)
   * @param words - Variable name, array/range values, optional step, and optional command
   * @returns 1 if loop continues, 0 if loop is complete
   */
  foreach: (index: number, ...words: WORD[]) => WORD_RESULT

  /**
   * Waits for a condition to become truthy. Yields if condition is false.
   * @param words - The condition to wait for
   * @returns 1 if condition is truthy, 0 otherwise (and yields)
   */
  waitfor: (...words: WORD[]) => WORD_RESULT

  /**
   * Logical OR operation. Returns the first truthy value, or the last value if all are falsy.
   * @param words - Values to evaluate
   * @returns The first truthy value or the last value
   */
  or: (...words: WORD[]) => WORD

  /**
   * Logical AND operation. Returns the first falsy value, or the last value if all are truthy.
   * @param words - Values to evaluate
   * @returns The first falsy value or the last value
   */
  and: (...words: WORD[]) => WORD

  /**
   * Logical NOT operation. Inverts the truthiness of the value.
   * @param words - The value to negate
   * @returns 1 if value is falsy, 0 if value is truthy
   */
  not: (...words: WORD[]) => WORD

  /**
   * Evaluates an expression and returns its value.
   * @param value - The expression to evaluate
   * @returns The evaluated value
   */
  expr: (value: WORD) => WORD

  /**
   * Equality comparison. Uses deep equality for objects.
   * @param lhs - Left-hand side value
   * @param rhs - Right-hand side value
   * @returns 1 if equal, 0 otherwise
   */
  isEq: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Inequality comparison.
   * @param lhs - Left-hand side value
   * @param rhs - Right-hand side value
   * @returns 1 if not equal, 0 otherwise
   */
  isNotEq: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Less-than comparison for numbers.
   * @param lhs - Left-hand side number
   * @param rhs - Right-hand side number
   * @returns 1 if lhs < rhs, 0 otherwise
   */
  isLessThan: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Greater-than comparison for numbers.
   * @param lhs - Left-hand side number
   * @param rhs - Right-hand side number
   * @returns 1 if lhs > rhs, 0 otherwise
   */
  isGreaterThan: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Less-than-or-equal comparison for numbers.
   * @param lhs - Left-hand side number
   * @param rhs - Right-hand side number
   * @returns 1 if lhs <= rhs, 0 otherwise
   */
  isLessThanOrEq: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Greater-than-or-equal comparison for numbers.
   * @param lhs - Left-hand side number
   * @param rhs - Right-hand side number
   * @returns 1 if lhs >= rhs, 0 otherwise
   */
  isGreaterThanOrEq: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Addition operator. Supports both numbers and string concatenation.
   * @param lhs - Left-hand side value
   * @param rhs - Right-hand side value
   * @returns The sum or concatenation result
   */
  opPlus: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Subtraction operator for numbers.
   * @param lhs - Left-hand side number
   * @param rhs - Right-hand side number
   * @returns The difference
   */
  opMinus: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Exponentiation operator (power).
   * @param lhs - Base number
   * @param rhs - Exponent number
   * @returns lhs raised to the power of rhs
   */
  opPower: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Multiplication operator for numbers.
   * @param lhs - Left-hand side number
   * @param rhs - Right-hand side number
   * @returns The product
   */
  opMultiply: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Division operator for numbers.
   * @param lhs - Left-hand side number
   * @param rhs - Right-hand side number
   * @returns The quotient
   */
  opDivide: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Modulo (remainder) operator for numbers.
   * @param lhs - Left-hand side number
   * @param rhs - Right-hand side number
   * @returns The remainder of lhs / rhs
   */
  opModDivide: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Floor division operator for numbers.
   * @param lhs - Left-hand side number
   * @param rhs - Right-hand side number
   * @returns The floor of lhs / rhs
   */
  opFloorDivide: (lhs: WORD, rhs: WORD) => WORD

  /**
   * Unary plus operator (converts to number).
   * @param rhs - The value to convert
   * @returns The numeric value
   */
  opUniPlus: (rhs: WORD) => WORD

  /**
   * Unary minus operator (negates the number).
   * @param rhs - The number to negate
   * @returns The negated value
   */
  opUniMinus: (rhs: WORD) => WORD
}

/**
 * Converts a value to a result (truthy/falsy representation).
 * Arrays are truthy if they have length > 0, otherwise uses the value or 0.
 * @param value - The value to convert
 * @returns 1 if truthy, 0 if falsy
 */
function maptoresult(value: WORD): WORD {
  if (isarray(value)) {
    return value.length > 0 ? 1 : 0
  }
  return value ?? 0
}

/**
 * Creates a chip memory identifier by appending '_chip' to the given ID.
 * @param id - The base chip identifier
 * @returns The formatted chip memory identifier
 */
export function createchipid(id: string) {
  return `${id}_chip`
}

/**
 * Creates a sender identifier in the format 'vm:<id>'.
 * @param maybeid - Optional sender ID (defaults to empty string)
 * @returns The formatted sender identifier
 */
export function senderid(maybeid = '') {
  return `vm:${maybeid ?? ''}`
}

/**
 * Creates a new chip instance with the given ID, driver, and compiled build.
 * Initializes chip memory, labels, and execution state. Returns a CHIP object
 * with all lifecycle, state management, messaging, and logic APIs.
 *
 * @param id - Unique identifier for this chip
 * @param driver - The firmware driver type for hardware abstraction
 * @param build - The compiled generator build containing code and labels
 * @returns A fully configured CHIP instance ready for execution
 */
export function createchip(
  id: string,
  driver: DRIVER_TYPE,
  build: GeneratorBuild,
) {
  // chip memory
  const mem = createchipid(id)
  const flags = memoryreadflags(mem)

  // ref to generator instance
  // eslint-disable-next-line prefer-const
  let logic: MAYBE<GeneratorFunc>

  // create labels
  const labels = deepcopy(Object.entries(build.labels ?? {}))

  // init
  if (!isarray(flags.lb) || flags.lb.length !== labels.length) {
    // entry point state
    flags.lb = labels
    // lock states
    flags.lk = ''
    // scroll lock, gets cleared when player closes the scroll
    flags.sk = ''
    // we leave message unset
    flags.mg = undefined
    // we track where we are in execution
    flags.ec = 1
    // prevent infinite loop lockup
    flags.lc = 0
    // pause until next tick
    flags.ys = 0
    // execution frequency
    flags.ps = 0
    // chip is in ended state awaiting any messages
    flags.es = (build.errors?.length ?? 0) !== 0 ? 1 : 0
  }

  /**
   * Invokes a firmware command by name with the given arguments.
   * Falls back to 'shortsend' if the command is not found (unless command is 'send').
   * @param command - The command name to invoke
   * @param args - The command arguments
   * @returns 0 if command failed, 1 if command succeeded
   */
  function invokecommand(command: string, args: WORD[]): 0 | 1 {
    READ_CONTEXT.words = args
    const commandinvoke = firmwaregetcommand(driver, command)
    if (!ispresent(commandinvoke)) {
      if (command !== 'send') {
        return invokecommand('shortsend', [command, ...args])
      }
      return 0
    }
    return commandinvoke(chip, args)
  }

  const chip: CHIP = {
    halt() {
      memoryclearflags(mem)
    },
    // id
    id() {
      return id
    },
    // internal state api
    set(name, value) {
      const [result, resultvalue] = firmwareset(driver, chip, name, value)
      if (result) {
        return resultvalue
      }
      // no result, return undefined
      return undefined
    },
    get(name) {
      const [result, resultvalue] = firmwareget(driver, chip, name)
      if (result) {
        return resultvalue
      }
      // no result, return undefined
      return undefined
    },

    // lifecycle api
    once() {
      // reset state
      flags.lc = 0
      flags.ys = 0

      // setup read context get
      READ_CONTEXT.get = chip.get

      // invoke logic impl
      try {
        if (!logic?.(chip)) {
          flags.es = 1
        }
      } catch (err: any) {
        apierror(SOFTWARE, READ_CONTEXT.elementfocus, 'crash', err.message)
        flags.es = 1
      }
    },
    tick(cycle) {
      // update execution frequency
      const pulse = isnumber(flags.ps) ? flags.ps : 0
      const activecycle = pulse % cycle === 0
      flags.ps = pulse + 1

      // execution frequency
      if (activecycle === false) {
        return false
      }

      // run regardless of tick
      firmwareeverytick(driver, chip)

      // chip is yield / ended state
      const shouldtick = chip.shouldtick()
      if (shouldtick) {
        chip.once()
      }

      // cleanup
      firmwareaftertick(driver, chip)
      return shouldtick
    },
    isended() {
      return flags.es === 1
    },
    isfirstpulse() {
      return flags.ps === 1
    },
    shouldtick() {
      return !flags.sk && (flags.es === 0 || chip.hm() !== 0)
    },
    checkcount() {
      if (isnumber(flags.lc)) {
        return ++flags.lc > RUNTIME.YIELD_AT_COUNT
      }
      return true
    },
    haslabel(label) {
      if (isarray(flags.lb)) {
        for (let i = 0; i < flags.lb.length; ++i) {
          const [name, labels] = flags.lb[i] as [string, number[]]
          if (name === label) {
            // pick first unzapped label to determine active
            const active =
              labels.find((item) => isnumber(item) && item > 0) ?? 0
            return active > 0
          }
        }
      }
      return false
    },
    hm() {
      if (isarray(flags.mg) && isarray(flags.lb)) {
        const [target] = flags.mg as [string] // unpack message
        if (ispresent(target)) {
          for (let i = 0; i < flags.lb.length; ++i) {
            const [name, labels] = flags.lb[i] as [string, number[]]
            if (name === target) {
              // pick first unzapped label
              return labels.find((item) => isnumber(item) && item > 0) ?? 0
            }
          }
        }
      }
      return 0
    },
    yield() {
      flags.ys = 1
    },
    jump(line) {
      flags.ec = line
    },
    sy() {
      return !!flags.ys || chip.checkcount()
    },
    send(player, chipid, message, data) {
      SOFTWARE.emit(player, `${senderid(chipid)}:${message}`, data)
    },
    lock(allowed) {
      flags.lk = allowed
    },
    unlock() {
      flags.lk = ''
    },
    scrolllock(player) {
      flags.sk = player
    },
    scrollunlock(player) {
      if (flags.sk === player) {
        flags.sk = ''
      }
    },
    message(incoming) {
      // internal messages while locked are allowed
      if (
        (flags.sk && incoming.player !== flags.sk) ||
        (flags.lk && incoming.sender !== flags.lk)
      ) {
        return
      }
      // validate we have given label
      if (chip.haslabel(incoming.target)) {
        flags.mg = [
          incoming.target,
          incoming.data,
          incoming.sender,
          incoming.player,
        ]
      } else {
        // should we raise an error ?
      }
    },
    zap(label) {
      if (isarray(flags.lb)) {
        for (let i = 0; i < flags.lb.length; ++i) {
          const entry = flags.lb[i] as [string, number[]]
          if (entry[0] === label) {
            // zap first active label
            const index = entry[1].findIndex((item) => item > 0)
            if (index >= 0 && ispresent(entry[1])) {
              entry[1][index] *= -1
              break
            }
          }
        }
        // console.info('zap', deepcopy(flags.lb))
      }
    },
    restore(label) {
      if (isarray(flags.lb)) {
        for (let i = 0; i < flags.lb.length; ++i) {
          const entry = flags.lb[i] as [string, number[]]
          if (entry[0] === label) {
            // restore all labels
            for (let l = 0; l < entry[1].length; l++) {
              entry[1][l] = Math.abs(entry[1][l])
            }
          }
        }
        // console.info('restore', deepcopy(flags.lb))
      }
    },
    getcase() {
      // ensure execution cursor
      flags.ec = isnumber(flags.ec) ? flags.ec : 1

      // check for pending messages
      const line = chip.hm()
      if (line && isarray(flags.mg)) {
        // incoming.target,
        // incoming.data,
        // incoming.sender,
        // incoming.player,
        const [, arg, sender, player] = flags.mg as [
          string,
          any,
          string,
          string,
        ]

        // update chip state based on incoming message
        chip.set('senderid', sender)
        if (ispresent(arg)) {
          chip.set('arg', arg)
        }

        // this sets player focus
        if (player) {
          // update player stat
          chip.set('player', player)
          // update read context as well
          READ_CONTEXT.elementfocus = player
        }

        // clear message
        flags.mg = undefined

        // reset ended state
        flags.ys = 0
        flags.es = 0

        // update ec
        flags.ec = line
      }

      // always return flags.ec
      return flags.ec
    },
    nextcase() {
      // get execution cursor state
      const cursor = isnumber(flags.ec) ? flags.ec : 1
      // inc it
      flags.ec = cursor + 1
      // always return flags.ec
      return flags.ec
    },
    endofprogram() {
      chip.yield()
      flags.es = 1
    },
    stacktrace(error) {
      const stack = ErrorStackParser.parse(error)
      const [entry] = stack.filter(
        (item) => item.fileName === GENERATED_FILENAME,
      )
      return {
        line: entry?.lineNumber ?? 0,
        column: entry?.columnNumber ?? 0,
      }
    },

    // logic api
    text(value) {
      return invokecommand('text', [value])
    },
    stat(...words) {
      return invokecommand('stat', words)
    },
    hyperlink(...words) {
      return invokecommand('hyperlink', words)
    },
    print(value) {
      if (isarray(value)) {
        return `array ${value.length} ${value.length === 1 ? 'item' : 'items'}`
      }
      if (typeof value === 'object') {
        return `obj ${Object.keys(value).join(', ')}`
      }
      return value
    },
    template(words) {
      const result = tokenize(words.join(' '), true)
      return result.tokens
        .map((token) => {
          if (token.tokenType === MaybeFlag) {
            const maybevalue = chip.get(token.image.substring(1))
            if (ispresent(maybevalue)) {
              return maybevalue
            }
          }
          return token.image
        })
        .join(' ')
    },
    command(...words) {
      // 0 - continue
      // 1 - retrys
      if (words.length === 0) {
        // bail on empty commands
        return 0
      }
      // invoke
      const [name, ...args] = words
      return invokecommand(NAME(maptostring(name)), args)
    },
    if(...words) {
      const [value, ii] = readargs(words, 0, [ARG_TYPE.ANY])
      const result = maptoresult(value)

      if (result && ii < words.length) {
        chip.command(...words.slice(ii))
      }

      return result ? 1 : 0
    },
    try(...words) {
      const [, ii] = readargs(words, 0, [ARG_TYPE.DIR])

      // try and move
      const result = chip.command('go', ...words)
      if (result && ii < words.length) {
        chip.command(...words.slice(ii))
      }

      return result ? 1 : 0
    },
    take(...words) {
      const [name, maybedec, ii] = readargs(words, 0, [
        ARG_TYPE.NAME,
        ARG_TYPE.ANY,
      ])

      // given custom dec amount
      const hasdec = isnumber(maybedec)

      // fail branch logic
      const iii = hasdec ? ii : 1

      // default to #TAKE <name> 1
      const current = chip.get(name)
      const value = hasdec ? maybedec : 1

      // taking from an unset flag, or non-numerical value
      if (!isnumber(current)) {
        if (iii < words.length) {
          chip.command(...words.slice(iii))
        }
        return 1
      }

      // returns true when take fails
      const newvalue = current - value
      if (newvalue < 0) {
        if (iii < words.length) {
          chip.command(...words.slice(iii))
        }
        return 1
      }

      // update flag
      chip.set(name, newvalue)
      return 0
    },
    give(...words) {
      const [name, maybeinc, ii] = readargs(words, 0, [
        ARG_TYPE.NAME,
        ARG_TYPE.ANY,
      ])

      // given custom inc amount
      const hasinc = isnumber(maybeinc)

      // fail branch logic
      const iii = hasinc ? ii : 1

      // default to #GIVE <name> 1
      const maybecurrent = chip.get(name)
      const value = hasinc ? maybeinc : 1

      // returns true when setting an unset flag
      const result = maybecurrent === undefined ? 1 : 0
      if (result) {
        if (iii < words.length) {
          chip.command(...words.slice(iii))
        }
      }

      // update flag
      chip.set(name, maptonumber(maybecurrent, 0) + value)
      return result
    },
    duplicate(...words) {
      return chip.command('duplicate', ...words)
    },
    repeatstart(index, ...words) {
      const [value, ii] = readargs(words, 0, [ARG_TYPE.NUMBER])
      const repeatcount = `repeatcount${index}`
      const repeatwords = `repeatwords${index}`
      flags[repeatcount] = value
      flags[repeatwords] = ii < words.length ? words.slice(ii) : undefined
    },
    repeat(index) {
      const repeatcount = `repeatcount${index}`
      const repeatwords = `repeatwords${index}`
      if (!isnumber(flags[repeatcount])) {
        return 0
      }

      const count = flags[repeatcount]
      flags[repeatcount] = count - 1

      const result = count > 0
      const repeatcmd = flags[repeatwords]

      if (result && isarray(repeatcmd)) {
        chip.command(...repeatcmd)
      }

      return result ? 1 : 0
    },
    foreachstart(_, ...words) {
      const [name, maybevalues] = readargs(words, 0, [
        ARG_TYPE.NAME,
        ARG_TYPE.ANY,
      ])
      if (isarray(maybevalues)) {
        const namevalues = `${name}_values`
        const allvalues = deepcopy(maybevalues)

        // set init state
        chip.set(name, allvalues.shift())
        chip.set(namevalues, allvalues)
      } else {
        const [, maybemin, maybemax, maybestep] = readargs(words, 0, [
          ARG_TYPE.NAME,
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
          ARG_TYPE.MAYBE_NUMBER,
        ])
        let min = Math.min(maybemin, maybemax)
        let max = Math.max(maybemin, maybemax)

        // step 0 is invalid, force to 1
        const step = (maybestep ?? 0) || 1
        if (step < 0) {
          const t = min
          min = max
          max = t
        }

        // set init state
        chip.set(name, min - step)
      }
      return 0
    },
    foreach(_, ...words) {
      const [name, maybevalues] = readargs(words, 0, [
        ARG_TYPE.NAME,
        ARG_TYPE.ANY,
      ])

      if (isarray(maybevalues)) {
        const namevalues = `${name}_values`
        const allvalues = chip.get(namevalues)
        const nextvalue = allvalues.shift()
        chip.set(name, nextvalue)
        return allvalues.length > 0 ? 1 : 0
      }

      const [, maybemin, maybemax, maybestep, ii] = readargs(words, 0, [
        ARG_TYPE.NAME,
        ARG_TYPE.NUMBER,
        ARG_TYPE.NUMBER,
        ARG_TYPE.MAYBE_NUMBER,
      ])

      let min = Math.min(maybemin, maybemax)
      let max = Math.max(maybemin, maybemax)

      // step 0 is invalid, force to 1
      const step = (maybestep ?? 0) || 1
      if (step < 0) {
        const t = min
        min = max
        max = t
      }

      // get current value and get an init state
      let value = chip.get(name)
      if (!isnumber(value) || value < min || value > max) {
        // reset on nan or invalid range
        value = min
      } else {
        value += step
      }

      const result = value <= max ? 1 : 0
      if (result) {
        // only set when within the value range A to B
        chip.set(name, value)
        if (ii < words.length) {
          chip.command(...words.slice(ii))
        }
      }

      return result
    },
    waitfor(...words) {
      const [value] = readargs(words, 0, [ARG_TYPE.ANY])
      const result = maptoresult(value)

      if (!result) {
        // conditional failed, yield until next tick
        chip.yield()
      }

      return result ? 1 : 0
    },
    or(...words) {
      let lastvalue = 0
      for (let i = 0; i < words.length; ) {
        const [value, next] = readargs(words, i, [ARG_TYPE.ANY])
        lastvalue = value
        if (lastvalue) {
          break // or returns the first truthy value
        }
        i = next
      }
      return lastvalue
    },
    and(...words) {
      let lastvalue = 0
      for (let i = 0; i < words.length; ) {
        const [value, next] = readargs(words, i, [ARG_TYPE.ANY])
        lastvalue = value
        if (!lastvalue) {
          break // and returns the first falsy value, or the last value
        }
        i = next
      }
      return lastvalue
    },
    not(...words) {
      // invert outcome
      const [value] = readargs(words, 0, [ARG_TYPE.ANY])
      const result = maptoresult(value)
      return result ? 0 : 1
    },
    expr(...words) {
      // parse expressions
      const [value] = readargs(words, 0, [ARG_TYPE.ANY])
      return value
    },
    isEq(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.ANY])
      const [right] = readargs([rhs], 0, [ARG_TYPE.ANY])
      if (typeof left === 'object' || typeof right === 'object') {
        return isequal(left, right) ? 1 : 0
      }
      return left === right ? 1 : 0
    },
    isNotEq(lhs, rhs) {
      return this.isEq(lhs, rhs) ? 0 : 1
    },
    isLessThan(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left < right ? 1 : 0
    },
    isGreaterThan(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left > right ? 1 : 0
    },
    isLessThanOrEq(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left <= right ? 1 : 0
    },
    isGreaterThanOrEq(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left >= right ? 1 : 0
    },
    opPlus(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.ANY])
      const [right] = readargs([rhs], 0, [ARG_TYPE.ANY])
      return left + right
    },
    opMinus(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.ANY])
      const [right] = readargs([rhs], 0, [ARG_TYPE.ANY])
      return left - right
    },
    opPower(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return Math.pow(left, right)
    },
    opMultiply(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left * right
    },
    opDivide(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left / right
    },
    opModDivide(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left % right
    },
    opFloorDivide(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return Math.floor(left / right)
    },
    opUniPlus(rhs) {
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return +right
    },
    opUniMinus(rhs) {
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return -right
    },
  }

  // track built function
  logic = build.code

  return chip
}
