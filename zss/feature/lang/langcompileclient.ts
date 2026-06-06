import { WASM_SCRIPT } from 'zss/config'

import { compile, type GeneratorBuild } from './backend/typescript/generator'
import {
  compilezssonmodule,
  createlangmodule,
} from './langwasmload'

let langmodule: Awaited<ReturnType<typeof createlangmodule>> | null = null
let langinit: Promise<void> | null = null

export function initlangcompile() {
  if (!WASM_SCRIPT) {
    return Promise.resolve()
  }
  if (!langinit) {
    langinit = createlangmodule()
      .then((mod) => {
        langmodule = mod
      })
      .catch(() => {
        langinit = null
      })
  }
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
  if (WASM_SCRIPT) {
    return compilewasmscript(name, text)
  }
  return compile(name, text)
}

void initlangcompile()
