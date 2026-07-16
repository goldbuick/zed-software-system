import { type ProgressInfo, pipeline } from '@huggingface/transformers'
import { createagentdownloadprogress } from 'zss/feature/agent/agentdownloadprogress'
import {
  type AGENT_LLM_PRESET,
  AGENT_LLM_PRESETS,
  normalizeagentllmpreset,
} from 'zss/feature/agent/agentpreset'
import {
  type AGENT_TOOL_CALL,
  AGENT_TOOL_SCHEMAS,
  isagenttoolname,
} from 'zss/feature/agent/agenttools'

const MODEL_DEVICE = 'webgpu'
const MAX_NEW_TOKENS = 768

type ChatMessage = {
  role: string
  content: string
}

type TextGenerator = Awaited<ReturnType<typeof pipeline<'text-generation'>>>

let generator: TextGenerator | undefined
let loadedpreset: AGENT_LLM_PRESET | undefined
let loadpromise: Promise<TextGenerator> | undefined

export type AGENT_GENERATE_RESULT = {
  raw: string
  text: string
  toolcalls: AGENT_TOOL_CALL[]
}

export async function ensureagentmodel(
  preset: AGENT_LLM_PRESET,
  onworking: (msg: string) => void,
): Promise<TextGenerator> {
  const row = AGENT_LLM_PRESETS[preset]
  if (generator && loadedpreset === preset) {
    return generator
  }
  if (loadpromise && loadedpreset === preset) {
    return loadpromise
  }
  await disposeagentmodel()
  loadedpreset = preset
  loadpromise = (async () => {
    onworking(`agent load ${row.label}`)
    const pipe = await pipeline('text-generation', row.modelid, {
      device: MODEL_DEVICE,
      dtype: row.dtype,
      progress_callback: createagentdownloadprogress(onworking) as (
        info: ProgressInfo,
      ) => void,
    })
    generator = pipe
    loadpromise = undefined
    onworking('agent model ready')
    return pipe
  })()
  try {
    return await loadpromise
  } catch (error) {
    loadpromise = undefined
    loadedpreset = undefined
    generator = undefined
    throw error
  }
}

export async function disposeagentmodel(): Promise<void> {
  loadpromise = undefined
  loadedpreset = undefined
  if (
    generator &&
    typeof (generator as { dispose?: () => Promise<void> }).dispose ===
      'function'
  ) {
    await (generator as { dispose: () => Promise<void> }).dispose()
  }
  generator = undefined
}

function parseargs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
  }
  return {}
}

function extracttoolcalls(
  raw: string,
  structured?: unknown,
): AGENT_TOOL_CALL[] {
  const out: AGENT_TOOL_CALL[] = []
  if (Array.isArray(structured)) {
    for (let i = 0; i < structured.length; ++i) {
      const row = structured[i] as {
        type?: string
        function?: { name?: string; arguments?: unknown }
        name?: string
        arguments?: unknown
      }
      const name = row.function?.name ?? row.name
      if (isstringname(name) && isagenttoolname(name)) {
        out.push({
          name,
          arguments: parseargs(row.function?.arguments ?? row.arguments),
        })
      }
    }
  }
  const block =
    /call\s+(\w+)\s*\{([\s\S]*?)\}|tool_call[\s\S]*?name["']?\s*[:=]\s*["'](\w+)["'][\s\S]*?arguments["']?\s*[:=]\s*(\{[\s\S]*?\})/gi
  let match: RegExpExecArray | null
  while ((match = block.exec(raw))) {
    const name = match[1] || match[3]
    const argsraw = match[2] || match[4] || '{}'
    if (isstringname(name) && isagenttoolname(name)) {
      let argumentsobj: Record<string, unknown> = {}
      try {
        argumentsobj = parseargs(
          argsraw.trim().startsWith('{') ? argsraw : `{${argsraw}}`,
        )
      } catch {
        argumentsobj = {}
      }
      out.push({ name, arguments: argumentsobj })
    }
  }
  return out
}

function isstringname(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export async function agentgeneratestep(
  presetraw: string | AGENT_LLM_PRESET,
  systemprompt: string,
  history: ChatMessage[],
  onworking: (msg: string) => void,
): Promise<AGENT_GENERATE_RESULT> {
  const preset = normalizeagentllmpreset(presetraw)
  const pipe = await ensureagentmodel(preset, onworking)
  const messages: ChatMessage[] = [
    { role: 'system', content: systemprompt },
    ...history,
  ]
  onworking('agent thinking …')
  const output = await pipe(messages as never, {
    max_new_tokens: MAX_NEW_TOKENS,
    do_sample: true,
    temperature: 1.0,
    top_p: 0.95,
    top_k: 64,
    tools: AGENT_TOOL_SCHEMAS as unknown as never[],
  })
  const row = Array.isArray(output) ? output[0] : output
  const generated =
    row && typeof row === 'object' && 'generated_text' in row
      ? (row as { generated_text: unknown }).generated_text
      : row
  let raw = ''
  if (typeof generated === 'string') {
    raw = generated
  } else if (Array.isArray(generated)) {
    const last = generated[generated.length - 1] as {
      content?: string
      role?: string
    }
    raw =
      typeof last?.content === 'string'
        ? last.content
        : JSON.stringify(generated)
  } else if (generated && typeof generated === 'object') {
    raw = JSON.stringify(generated)
  }
  const structured =
    row && typeof row === 'object' && 'tool_calls' in row
      ? (row as { tool_calls: unknown }).tool_calls
      : undefined
  const toolcalls = extracttoolcalls(raw, structured)
  return { raw, text: raw, toolcalls }
}

export function agentreadloadedpreset(): AGENT_LLM_PRESET | undefined {
  return loadedpreset
}
