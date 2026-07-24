import type { IToken } from 'chevrotain'

import { NAME } from 'zss/words/types'

import {
  DIR_MOD_CONTINUES,
  DIR_NEED_KIND,
  DIR_NEED_PAIR,
  DIR_NEED_SUBDIR,
} from './completioncontext'
import { command, newline } from './lexer'

export type FORMAT_LANG_ERROR_INPUT = {
  kind: 'lexer' | 'parser'
  raw: string
  token?: IToken
  linetokens?: IToken[]
}

export type FORMAT_LANG_ERROR_RESULT = {
  message: string
}

const MAX_MESSAGE_LEN = 120

const BLOCK_COMMANDS = new Set(['if', 'while', 'repeat', 'foreach', 'try'])

const DIR_HINT =
  'expected direction (up, down, left, right, flow, by, at, ...)'
const COLOR_HINT = 'expected color name (red, blue, onred, ...)'
const STMT_HINT = 'expected statement or #command'
const VALUE_HINT = 'expected value (number, string, color, or expression)'

function capmessage(message: string): string {
  if (message.length <= MAX_MESSAGE_LEN) {
    return message
  }
  return `${message.slice(0, MAX_MESSAGE_LEN - 3)}...`
}

function tokentypename(token: IToken | undefined): string {
  return token?.tokenType?.name ?? ''
}

function tokenisnewline(token: IToken | undefined): boolean {
  if (!token) {
    return false
  }
  return (
    token.tokenType === newline ||
    tokentypename(token) === 'token_newline' ||
    token.image === '\n'
  )
}

function rawfoundnewline(raw: string): boolean {
  return (
    raw.includes("but found: '\\n'") ||
    raw.includes('but found: "\n"') ||
    raw.includes("but found: '\n'")
  )
}

function extractfoundtext(raw: string): string | undefined {
  const match = raw.match(/but found: '((?:\\'|[^'])*)'/)
  if (match) {
    return match[1].replace(/\\n/g, '\n').replace(/\\'/g, "'")
  }
  const redundant = raw.match(
    /Redundant input, expecting EOF but found: (.+)$/,
  )
  if (redundant) {
    return redundant[1].trim()
  }
  return undefined
}

function extractinvalidchar(raw: string): string | undefined {
  const match = raw.match(/unexpected character: ->(.+)<-/)
  return match?.[1]
}

function lastmeaningfultoken(linetokens: IToken[]): IToken | undefined {
  for (let i = linetokens.length - 1; i >= 0; i--) {
    const token = linetokens[i]
    const name = tokentypename(token)
    if (name === 'token_whitespace') {
      continue
    }
    return token
  }
  return undefined
}

function tokeniscommand(token: IToken | undefined): boolean {
  return tokentypename(token) === 'token_command'
}

function commandafterhash(linetokens: IToken[]): string | undefined {
  for (let i = 0; i < linetokens.length - 1; i++) {
    if (tokeniscommand(linetokens[i])) {
      return NAME(linetokens[i + 1]?.image ?? '').toLowerCase()
    }
  }
  return undefined
}

function linehasblockopener(linetokens: IToken[]): string | undefined {
  const cmd = commandafterhash(linetokens)
  if (cmd && BLOCK_COMMANDS.has(cmd)) {
    return cmd
  }
  return undefined
}

function linehasdo(linetokens: IToken[]): boolean {
  for (let i = 0; i < linetokens.length - 1; i++) {
    if (
      tokeniscommand(linetokens[i]) &&
      NAME(linetokens[i + 1]?.image ?? '').toLowerCase() === 'do'
    ) {
      return true
    }
  }
  return false
}

function messagematchesdirset(raw: string): boolean {
  return raw.includes('[token_idle]') && raw.includes('[token_up]')
}

function messagematchescolorset(raw: string): boolean {
  return raw.includes('[token_black]') && raw.includes('[token_blue]')
}

function messagematchescommandset(raw: string): boolean {
  return (
    raw.includes('[token_command, token_') &&
    (raw.includes('token_if]') ||
      raw.includes('token_change]') ||
      raw.includes('token_become]'))
  )
}

function messagematchesexprset(raw: string): boolean {
  return (
    raw.includes('[token_numberliteral]') &&
    raw.includes('[token_stringliteral]')
  )
}

function tryincompletedirmod(
  linetokens: IToken[],
  raw: string,
  token: IToken | undefined,
): string | undefined {
  if (!rawfoundnewline(raw) && !tokenisnewline(token)) {
    return undefined
  }
  const last = lastmeaningfultoken(linetokens)
  if (!last) {
    return undefined
  }
  const mod = NAME(last.image ?? '').toLowerCase()
  if (!DIR_MOD_CONTINUES.has(mod)) {
    return undefined
  }
  if (DIR_NEED_KIND.has(mod)) {
    return `${mod} needs an object or terrain kind`
  }
  if (DIR_NEED_PAIR.has(mod)) {
    return `${mod} needs two numbers (x y)`
  }
  if (DIR_NEED_SUBDIR.has(mod)) {
    return `${mod} needs a direction`
  }
  if (mod === 'beam') {
    return 'beam needs a length number and direction'
  }
  if (mod === 'within' || mod === 'awayby') {
    return `${mod} needs a distance number`
  }
  return `direction incomplete: ${mod} needs a base dir (flow, up, north, ...)`
}

function tryunclosedblock(
  linetokens: IToken[],
  raw: string,
  token: IToken | undefined,
): string | undefined {
  if (!rawfoundnewline(raw) && !tokenisnewline(token)) {
    return undefined
  }
  const blockcmd = linehasblockopener(linetokens)
  if (!blockcmd || linehasdo(linetokens)) {
    return undefined
  }
  return `#${blockcmd} block needs #do ... #done`
}

function tryredundantinput(
  linetokens: IToken[],
  raw: string,
): string | undefined {
  if (!raw.startsWith('Redundant input, expecting EOF but found:')) {
    return undefined
  }
  const found = extractfoundtext(raw)
  if (!found) {
    return 'extra text after statement'
  }
  if (found.length === 1) {
    return `extra text '${found}' after statement`
  }
  if (linetokens.length > 0) {
    return `extra text '${found}' after statement`
  }
  return `unexpected text '${found}' after end of statement`
}

function trylabelcommandconfusion(
  linetokens: IToken[],
  raw: string,
): string | undefined {
  const found = extractfoundtext(raw)
  if (!found) {
    return undefined
  }
  const last = lastmeaningfultoken(linetokens)
  if (
    last &&
    tokentypename(last) === 'token_label' &&
    messagematchescommandset(raw)
  ) {
    const label = (last.image ?? '').slice(1).trim()
    return `use #${label} for a command, not :${label}`
  }
  if (found.startsWith(':') && messagematchescommandset(raw)) {
    return `use #${found.slice(1)} for a command, not ${found}`
  }
  return undefined
}

function formatlexererror(raw: string): string {
  const badchar = extractinvalidchar(raw)
  if (badchar) {
    return capmessage(`invalid character '${badchar}'`)
  }
  return capmessage(raw.replace(/\s+/g, ' ').trim())
}

function formatparsererror(
  raw: string,
  token: IToken | undefined,
  linetokens: IToken[],
): string {
  const context =
    tryincompletedirmod(linetokens, raw, token) ??
    tryunclosedblock(linetokens, raw, token) ??
    trylabelcommandconfusion(linetokens, raw) ??
    tryredundantinput(linetokens, raw)

  if (context) {
    return capmessage(context)
  }

  if (messagematchesdirset(raw)) {
    return capmessage(DIR_HINT)
  }
  if (messagematchescolorset(raw)) {
    return capmessage(COLOR_HINT)
  }
  if (messagematchescommandset(raw)) {
    return capmessage(STMT_HINT)
  }
  if (messagematchesexprset(raw)) {
    return capmessage(VALUE_HINT)
  }

  const found = extractfoundtext(raw)
  if (found && raw.includes('Expecting')) {
    if (found === '\n' || found === '\\n') {
      return capmessage('unexpected end of line')
    }
    return capmessage(`unexpected '${found}' here`)
  }

  if (raw.startsWith('Redundant input')) {
    return capmessage(tryredundantinput(linetokens, raw) ?? STMT_HINT)
  }

  const shortened = raw
    .replace(/Expecting: one of these possible Token sequences:\s*/i, '')
    .replace(/\[\s*token_[^\]]+\]/g, '')
    .replace(/\d+\.\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (shortened && shortened !== raw) {
    return capmessage('syntax error near this spot')
  }

  return capmessage(raw.replace(/\s+/g, ' ').trim())
}

/** Tokens on the same source line before the fault token. */
export function linetokensbeforefault(
  input: IToken[],
  fault: IToken,
): IToken[] {
  const line = fault.startLine
  const offset = fault.startOffset ?? 0
  return input.filter((token) => {
    if (token.startLine !== line) {
      return false
    }
    return (token.startOffset ?? 0) < offset
  })
}

export function formatlangerror(
  input: FORMAT_LANG_ERROR_INPUT,
): FORMAT_LANG_ERROR_RESULT {
  const linetokens = input.linetokens ?? []
  if (input.kind === 'lexer') {
    return { message: formatlexererror(input.raw) }
  }
  return {
    message: formatparsererror(input.raw, input.token, linetokens),
  }
}
