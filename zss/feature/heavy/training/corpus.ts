import { formatgemmanativetoolcall } from 'zss/feature/heavy/llm/nativetoolcall'
import {
  RUN_ZSS_COMMAND_TOOL_NAME,
  WRITE_ZSS_SCRIPT_TOOL_NAME,
} from 'zss/feature/heavy/llm/toolnames'
import { compileast } from 'zss/feature/lang/backend/typescript/ast'

export const CORPUS_SYSTEM_PROMPT =
  `You are a ZSS codepage script author for the Zed Software System.
Emit tool calls only — use write_zss_script for script snippets and run_zss_command for agent CLI.
Script uses #if #while :labels ?dir /dir any color kind — not Python or JavaScript.
CLI uses #userinput #pilot #query #put — not codepage #if logic.`.trim()

export type CorpusEntry = {
  id: string
  sourcefile: string
  snippet: string
  user: string
  assistant: string
  split: 'train' | 'eval'
  kind: 'script' | 'cli' | 'negative'
}

export type CorpusManifest = {
  generated: string
  traincount: number
  evalcount: number
  compilepassrate: number
  entries: { id: string; split: string; kind: string; sourcefile: string }[]
}

const COLORS = [
  'black',
  'red',
  'blue',
  'green',
  'cyan',
  'purple',
  'yellow',
  'white',
]
const DIRS = ['n', 's', 'e', 'w', 'up', 'down', 'left', 'right']
const KINDS = [
  'line',
  'player',
  'solid',
  'breakable',
  'flow',
  'ricochet',
  'gem',
  'fish',
  'water',
]

const LABEL_LINE = /^:([^;\n]+)/

export function compilefiltersnippet(name: string, snippet: string): boolean {
  void name
  const result = compileast(snippet)
  return !(result.errors && result.errors.length > 0) && !!result.ast
}

export function splithandlers(
  source: string,
): { label: string; body: string }[] {
  const lines = source.split('\n')
  const handlers: { label: string; body: string }[] = []
  let currentlabel = ''
  let currentlines: string[] = []

  function flush() {
    if (currentlines.length === 0) {
      return
    }
    const body = `${currentlines.join('\n').trimEnd()}\n`
    handlers.push({
      label: currentlabel || 'main',
      body,
    })
    currentlines = []
  }

  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i]
    const labelmatch = LABEL_LINE.exec(line)
    if (
      labelmatch &&
      (line.startsWith(':') || line.trimStart().startsWith(':'))
    ) {
      flush()
      currentlabel = labelmatch[1].trim()
      currentlines = [line]
    } else {
      currentlines.push(line)
    }
  }
  flush()
  return handlers
}

export function scriptsystemprompt(): string {
  return CORPUS_SYSTEM_PROMPT
}

export function formatscripttoolassistant(
  pageid: string,
  snippet: string,
  mode: 'append' | 'replace_handler' | 'replace_all' = 'append',
): string {
  return formatgemmanativetoolcall(WRITE_ZSS_SCRIPT_TOOL_NAME, {
    page_id: pageid,
    snippet: snippet.trimEnd(),
    mode,
  })
}

export function formatclitoolassistant(line: string): string {
  return formatgemmanativetoolcall(RUN_ZSS_COMMAND_TOOL_NAME, {
    line: line.trim(),
  })
}

export function templateuserprompt(kind: string, snippet: string): string {
  if (snippet.includes('#if any')) {
    return `Write ZSS that checks ${kind} using any/spatial if logic like: ${snippet.split('\n')[0]?.trim()}`
  }
  if (snippet.includes('?')) {
    return `Add a non-blocking short try move in ZSS: ${snippet.split('\n')[0]?.trim()}`
  }
  if (snippet.startsWith(':')) {
    return `Write a ZSS handler starting with ${snippet.split('\n')[0]?.trim()}`
  }
  return `Write ZSS script snippet for ${kind}`
}

export function augmenttemplates(
  evalids: Set<string>,
): Omit<CorpusEntry, 'split'>[] {
  const out: Omit<CorpusEntry, 'split'>[] = []
  let idx = 0
  for (let c = 0; c < COLORS.length && c < 8; ++c) {
    for (let k = 0; k < KINDS.length && k < 6; ++k) {
      const snippet = `#if any ${COLORS[c]} ${KINDS[k]} ?${DIRS[c % DIRS.length]}\n#done\n#idle\n`
      const id = `tpl_any_${COLORS[c]}_${KINDS[k]}`
      if (evalids.has(id) || !compilefiltersnippet(id, snippet)) {
        continue
      }
      out.push({
        id,
        sourcefile: 'template:any_color_kind',
        snippet,
        user: `When any ${COLORS[c]} ${KINDS[k]} is nearby, short try ${DIRS[c % DIRS.length]}`,
        assistant: formatscripttoolassistant('object1', snippet),
        kind: 'script',
      })
      idx++
      if (idx >= 24) {
        return out
      }
    }
  }
  for (let d = 0; d < DIRS.length; ++d) {
    const snippet = `#if any ${DIRS[d]} line give p1 1\n`
    const id = `tpl_any_dir_line_${DIRS[d]}`
    if (evalids.has(id) || !compilefiltersnippet(id, snippet)) {
      continue
    }
    out.push({
      id,
      sourcefile: 'template:any_dir_kind',
      snippet,
      user: `If any line to the ${DIRS[d]}, give p1 flag bit 1`,
      assistant: formatscripttoolassistant('terrain1', snippet, 'append'),
      kind: 'script',
    })
  }
  return out
}

export function clitrainentries(): Omit<CorpusEntry, 'split'>[] {
  const pairs: { user: string; line: string; intent: string }[] = [
    { user: 'go north', line: '#userinput up', intent: 'movement' },
    { user: 'walk to 10 5', line: '#pilot 10 5', intent: 'movement' },
    { user: "what's on this board?", line: '#query', intent: 'question' },
    { user: 'what does the scroll say?', line: '#look', intent: 'question' },
    {
      user: 'place a purple solid to the north',
      line: '#put n purple solid',
      intent: 'action',
    },
  ]
  return pairs.map((pair, i) => ({
    id: `cli_${pair.intent}_${i}`,
    sourcefile: 'agent:cli_scenarios',
    snippet: pair.line,
    user: pair.user,
    assistant: formatclitoolassistant(pair.line),
    kind: 'cli' as const,
  }))
}

export function entrytochatjsonl(entry: CorpusEntry): string {
  return JSON.stringify({
    messages: [
      { role: 'system', content: CORPUS_SYSTEM_PROMPT },
      { role: 'user', content: entry.user },
      { role: 'assistant', content: entry.assistant },
    ],
    metadata: {
      id: entry.id,
      split: entry.split,
      kind: entry.kind,
      sourcefile: entry.sourcefile,
    },
  })
}

export function buildcorpusmetrics(entries: CorpusEntry[]): {
  traincount: number
  evalcount: number
  compilepassrate: number
} {
  let train = 0
  let evalcount = 0
  let compiled = 0
  for (let i = 0; i < entries.length; ++i) {
    const e = entries[i]
    if (e.kind === 'negative') {
      if (e.split === 'train') {
        train++
      } else {
        evalcount++
      }
      continue
    }
    if (e.kind === 'script' && compilefiltersnippet(e.id, e.snippet)) {
      compiled++
    }
    if (e.split === 'train') {
      train++
    } else {
      evalcount++
    }
  }
  const scriptentries = entries.filter((e) => e.kind === 'script')
  const compilepassrate =
    scriptentries.length > 0 ? compiled / scriptentries.length : 1
  return { traincount: train, evalcount, compilepassrate }
}
