import { RUN_ZSS_COMMAND_TOOL_NAME } from './agenttools'

export type ParsedToolCall = {
  name: string
  arguments: Record<string, unknown>
}

function isrecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function istoolcallshape(v: unknown): v is ParsedToolCall {
  if (!isrecord(v)) {
    return false
  }
  const name = v.name
  const args = v.arguments
  return typeof name === 'string' && isrecord(args)
}

function jsonfromfencedblock(s: string): string | undefined {
  const m = /```(?:json)?\s*([\s\S]*?)```/i.exec(s)
  return m ? m[1].trim() : undefined
}

/** First balanced JSON object or array starting at start index (best-effort). */
function extractbalancedjson(s: string, start: number): string | undefined {
  const open = s[start]
  if (open !== '{' && open !== '[') {
    return undefined
  }
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let instring = false
  let esc = false
  for (let i = start; i < s.length; ++i) {
    const c = s[i]
    if (instring) {
      if (esc) {
        esc = false
      } else if (c === '\\') {
        esc = true
      } else if (c === '"') {
        instring = false
      }
      continue
    }
    if (c === '"') {
      instring = true
      continue
    }
    if (c === open) {
      depth++
    } else if (c === close) {
      depth--
      if (depth === 0) {
        return s.slice(start, i + 1)
      }
    }
  }
  return undefined
}

function tryparsejsonpayload(s: string): unknown | undefined {
  const inner = jsonfromfencedblock(s)
  if (inner !== undefined) {
    try {
      return JSON.parse(inner)
    } catch {
      // fall through
    }
  }
  const t = s.trim()
  try {
    return JSON.parse(t)
  } catch {
    // fall through
  }
  const brace = t.indexOf('{')
  const bracket = t.indexOf('[')
  let start = -1
  if (brace >= 0 && (bracket < 0 || brace < bracket)) {
    start = brace
  } else if (bracket >= 0) {
    start = bracket
  }
  if (start < 0) {
    return undefined
  }
  const slice = extractbalancedjson(t, start)
  if (slice === undefined) {
    return undefined
  }
  try {
    return JSON.parse(slice)
  } catch {
    return undefined
  }
}

function normalizedcalls(parsed: unknown): ParsedToolCall[] {
  if (parsed === undefined) {
    return []
  }
  if (Array.isArray(parsed)) {
    const out: ParsedToolCall[] = []
    for (let i = 0; i < parsed.length; ++i) {
      if (istoolcallshape(parsed[i])) {
        out.push(parsed[i])
      }
    }
    return out
  }
  if (istoolcallshape(parsed)) {
    return [parsed]
  }
  return []
}

/**
 * Extract Gemma / HF-style tool calls (`name` + `arguments`) from assistant output.
 * Accepts a bare object, an array of calls, or JSON inside markdown fences / trailing text.
 */
export function parsetoolcallsfromassistant(raw: string): ParsedToolCall[] {
  return normalizedcalls(tryparsejsonpayload(raw))
}

export function validatedzsslinetoolcalls(calls: ParsedToolCall[]): string[] {
  const lines: string[] = []
  for (let i = 0; i < calls.length; ++i) {
    const c = calls[i]
    if (c.name !== RUN_ZSS_COMMAND_TOOL_NAME) {
      continue
    }
    const line = c.arguments.line
    if (typeof line !== 'string') {
      continue
    }
    const t = line.trim()
    if (t.startsWith('#') || t.startsWith('!')) {
      lines.push(t)
    }
  }
  return lines
}
