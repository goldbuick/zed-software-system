import { agentlog } from 'zss/agentlog'
import { WASM_SCRIPT } from 'zss/config'

import { type GeneratorBuild, compile } from './backend/typescript/generator'
import { compilezssonmodule, createlangmodule } from './langwasmload'

let langmodule: Awaited<ReturnType<typeof createlangmodule>> | null = null
let langinit: Promise<void> | null = null

export function initlangcompile() {
  if (!WASM_SCRIPT) {
    return Promise.resolve()
  }
  langinit ??= createlangmodule()
    .then((mod) => {
      langmodule = mod
      agentlog(
        'langcompileclient.ts:init',
        'lang module ready',
        { wasmscript: WASM_SCRIPT },
        'B',
      )
    })
    .catch((err) => {
      agentlog(
        'langcompileclient.ts:init',
        'lang module init failed',
        { error: String(err) },
        'B',
      )
      langinit = null
    })
  return langinit
}

export function islangcompileready() {
  return !WASM_SCRIPT || langmodule !== null
}

function labelsfromjson(labelsjson: string): GeneratorBuild['labels'] {
  if (!labelsjson.trim()) {
    return {}
  }
  try {
    return JSON.parse(labelsjson) as GeneratorBuild['labels']
  } catch {
    return {}
  }
}

export function compilewasmscript(name: string, text: string): GeneratorBuild {
  if (!langmodule) {
    agentlog(
      'langcompileclient.ts:compilewasmscript',
      'compile without lang module',
      { name, ready: islangcompileready() },
      'A',
    )
    return {
      errors: [
        {
          message: 'lang wasm compiler not loaded',
          offset: 0,
          line: 0,
          column: 0,
          length: 0,
        },
      ],
    }
  }
  const result = compilezssonmodule(name, text, langmodule)
  agentlog(
    'langcompileclient.ts:compilewasmscript',
    'compile result',
    {
      name,
      wasmbytes: result.wasmbytes.length,
      errors: result.errors.map((e) => e.message),
    },
    'A',
  )
  if (result.errors.length) {
    return { errors: result.errors }
  }
  return {
    wasmbytes: result.wasmbytes,
    debugmap: result.debugmap,
    importmanifest: result.importmanifest,
    labels: labelsfromjson(result.labelsjson),
    errors: result.errors,
  }
}

export function compilescript(name: string, text: string): GeneratorBuild {
  const label = `compile-${name}`
  // eslint-disable-next-line no-console
  console.time(label)
  try {
    if (WASM_SCRIPT) {
      return compilewasmscript(name, text)
    }
    return compile(name, text)
  } finally {
    // eslint-disable-next-line no-console
    console.timeEnd(label)
  }
}

void initlangcompile()
