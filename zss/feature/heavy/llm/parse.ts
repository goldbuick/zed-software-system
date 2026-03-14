/**
 * Parsing library for raw LLM output: extract tool calls and clean text.
 * Supports XML <tool_call>, JSON object/array, and Pythonic formats.
 */

import type { MODEL_RESULT, PARSE_OPTIONS, TOOL_CALL } from './types'

const TOOL_CALL_REGEX = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g
const TOOL_CALL_TOKEN_REGEX =
  /<\|tool_call_start\|>([\s\S]*?)<\|tool_call_end\|>/g
const THINK_REGEX = /<think>[\s\S]*?<\/think>/gi
const PYTHONIC_CALL_REGEX = /(\w+)\s*\(\s*([^)]*)\s*\)/g
const SPECIAL_TOKEN_REGEX = /<\|[^|]*\|>/g

const DEFAULT_PARSE_OPTIONS: Required<
  Omit<PARSE_OPTIONS, 'jsonNestedToolCallKey'>
> & {
  jsonNestedToolCallKey?: string
} = {
  xmlArgKey: 'arguments',
  jsonObjectArgKey: 'parameters',
  tryJsonArray: true,
  tryPythonic: true,
  stripThink: true,
  stripSpecialTokens: true,
  toolCallStartEndTokens: false,
}

export function normalizetoolarg(arg: unknown): Record<string, string> {
  if (arg === null || typeof arg !== 'object') {
    return {}
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(arg)) {
    if (typeof v === 'string') {
      out[k] = v
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = JSON.stringify(v)
    } else if (v !== undefined && v !== null) {
      out[k] = String(v)
    }
  }
  return out
}

/** Parse Pythonic args string, e.g. location="NYC", unit="f" → { location: "NYC", unit: "f" }. */
export function parsepythonicargs(argsstr: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!argsstr.trim()) {
    return out
  }
  let i = 0
  const s = argsstr
  while (i < s.length) {
    while (i < s.length && /[\s,]/.test(s[i])) {
      i++
    }
    if (i >= s.length) {
      break
    }
    const keystart = i
    while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
      i++
    }
    const key = s.slice(keystart, i)
    if (!key) {
      break
    }
    while (i < s.length && s[i] !== '=') {
      i++
    }
    if (i >= s.length || s[i] !== '=') {
      break
    }
    i++
    while (i < s.length && /\s/.test(s[i])) {
      i++
    }
    if (i >= s.length) {
      break
    }
    if (s[i] === '"' || s[i] === "'") {
      const quote = s[i]
      i++
      const valstart = i
      while (i < s.length && s[i] !== quote) {
        if (s[i] === '\\') {
          i++
        }
        i++
      }
      out[key] = s.slice(valstart, i)
      i++
    } else {
      const valstart = i
      while (i < s.length && !/[\s,]/.test(s[i])) {
        i++
      }
      const raw = s.slice(valstart, i).trim()
      out[key] = raw === 'true' ? 'true' : raw === 'false' ? 'false' : raw
    }
  }
  return out
}

function findtoolarray(str: string): { arr: unknown[]; slice: string } | null {
  const start = str.indexOf('[')
  if (start === -1) {
    return null
  }
  let depth = 0
  let instring = false
  let escape = false
  let quote = ''
  for (let i = start; i < str.length; i++) {
    const c = str[i]
    if (escape) {
      escape = false
      continue
    }
    if (instring) {
      if (c === '\\') {
        escape = true
      } else if (c === quote) {
        instring = false
      }
      continue
    }
    if (c === '"' || c === "'") {
      instring = true
      quote = c
      continue
    }
    if (c === '[') {
      depth++
    } else if (c === ']') {
      depth--
      if (depth === 0) {
        const slice = str.slice(start, i + 1)
        try {
          const arr = JSON.parse(slice) as unknown
          return Array.isArray(arr) ? { arr, slice } : null
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function findtoolobject(
  str: string,
  argkey: 'arguments' | 'parameters',
  nestedkey?: string,
): { name: string; args: Record<string, string>; slice: string } | null {
  const start = str.indexOf('{')
  if (start === -1) {
    return null
  }
  let depth = 0
  let instring = false
  let escape = false
  let quote = ''
  for (let i = start; i < str.length; i++) {
    const c = str[i]
    if (escape) {
      escape = false
      continue
    }
    if (instring) {
      if (c === '\\') {
        escape = true
      } else if (c === quote) {
        instring = false
      }
      continue
    }
    if (c === '"' || c === "'") {
      instring = true
      quote = c
      continue
    }
    if (c === '{') {
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0) {
        const slice = str.slice(start, i + 1)
        const hasname = /"name"\s*:/.test(slice)
        const hasnested =
          nestedkey &&
          new RegExp(`"${nestedkey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`).test(
            slice,
          )
        if (!hasname && !hasnested) {
          return null
        }
        try {
          const parsed = JSON.parse(slice) as Record<string, unknown>
          let name = typeof parsed.name === 'string' ? parsed.name : ''
          let argsobj = parsed[argkey] ?? parsed.arguments ?? parsed.parameters
          if (!name && nestedkey) {
            const nested = parsed[nestedkey]
            if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
              const n = nested as Record<string, unknown>
              name = typeof n.name === 'string' ? n.name : ''
              argsobj = n.arguments ?? n.parameters ?? argsobj
            }
          }
          if (name) {
            return { name, args: normalizetoolarg(argsobj), slice }
          }
        } catch {
          // skip invalid JSON
        }
        return null
      }
    }
  }
  return null
}

/**
 * Parse raw model output into text and tool calls.
 * Uses options to decide which formats to try (XML, JSON object/array, Pythonic) and cleanup.
 */
export function parseresult(raw: string, options?: PARSE_OPTIONS): MODEL_RESULT {
  const opts = { ...DEFAULT_PARSE_OPTIONS, ...options }
  const toolcalls: TOOL_CALL[] = []
  let text = raw

  TOOL_CALL_REGEX.lastIndex = 0
  let match
  const xmlkey = opts.xmlArgKey ?? 'arguments'
  while ((match = TOOL_CALL_REGEX.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as {
        name?: unknown
        arguments?: unknown
        parameters?: unknown
      }
      const argsobj = parsed[xmlkey] ?? parsed.parameters ?? parsed.arguments
      toolcalls.push({
        name: typeof parsed.name === 'string' ? parsed.name : '',
        args: normalizetoolarg(argsobj),
      })
    } catch {
      // skip invalid JSON in <tool_call>
    }
  }

  text = text.replace(TOOL_CALL_REGEX, '').trim()

  if (opts.toolCallStartEndTokens) {
    TOOL_CALL_TOKEN_REGEX.lastIndex = 0
    let tctmatch
    while ((tctmatch = TOOL_CALL_TOKEN_REGEX.exec(text)) !== null) {
      const inner = tctmatch[1].trim()
      PYTHONIC_CALL_REGEX.lastIndex = 0
      let pymatch
      while ((pymatch = PYTHONIC_CALL_REGEX.exec(inner)) !== null) {
        toolcalls.push({ name: pymatch[1], args: parsepythonicargs(pymatch[2]) })
      }
    }
    text = text.replace(TOOL_CALL_TOKEN_REGEX, '').trim()
  }

  if (opts.tryJsonArray) {
    const arrayresult = findtoolarray(text)
    if (arrayresult) {
      const jsonkey = opts.jsonObjectArgKey ?? 'parameters'
      for (const item of arrayresult.arr) {
        if (item && typeof item === 'object' && 'name' in item) {
          const o = item as {
            name?: unknown
            arguments?: unknown
            parameters?: unknown
          }
          const name = o.name
          const argsobj = o[jsonkey] ?? o.arguments ?? o.parameters
          toolcalls.push({
            name: typeof name === 'string' ? name : '',
            args: normalizetoolarg(argsobj),
          })
        }
      }
      text = text.replace(arrayresult.slice, '').trim()
    }
  }

  const objkey = opts.jsonObjectArgKey ?? 'parameters'
  const nestedkey = opts.jsonNestedToolCallKey
  let objresult: ReturnType<typeof findtoolobject> | null
  while ((objresult = findtoolobject(text, objkey, nestedkey)) !== null) {
    toolcalls.push({ name: objresult.name, args: objresult.args })
    text = text.replace(objresult.slice, '').trim()
  }

  if (opts.tryPythonic) {
    text = text.replace(PYTHONIC_CALL_REGEX, (_full, name, argsstr) => {
      toolcalls.push({ name, args: parsepythonicargs(argsstr) })
      return ' '
    })
  }
  text = text.trim()

  if (opts.stripSpecialTokens) {
    text = text.replace(SPECIAL_TOKEN_REGEX, '').trim()
  }
  if (opts.stripThink) {
    text = text.replace(THINK_REGEX, '').trim()
  }

  return { text, toolcalls, raw }
}
