/**
 * Shared loader for cafe/public/wasm/lang (C++ zss_compile).
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const WADIR = path.join(ROOT, 'cafe/public/wasm/lang')

export async function createlangmodule() {
  const jspath = pathToFileURL(path.join(WADIR, 'zss_lang.js')).href
  const wasmpath = path.join(WADIR, 'zss_lang.wasm')
  const wasmbinary = readFileSync(wasmpath)
  const factory = (await import(jspath)).default
  return factory({
    wasmBinary: wasmbinary,
    locateFile: (file) => pathToFileURL(path.join(WADIR, file)).href,
  })
}

/**
 * @param {string} name
 * @param {string} source
 * @param {Awaited<ReturnType<typeof createlangmodule>>} module
 */
export function compilezss(name, source, module) {
  const compilefn = module.cwrap('zss_compile', 'number', ['string', 'string'])
  const freefn = module.cwrap('zss_compile_result_free', null, ['number'])

  const ptr = compilefn(name, source)
  const sourceptr = module.getValue(ptr, 'i32')
  const mapptr = module.getValue(ptr + 4, 'i32')
  const labelsptr = module.getValue(ptr + 8, 'i32')
  const errorcount = module.getValue(ptr + 16, 'i32')

  const errors = []
  if (errorcount > 0) {
    const errptr = module.getValue(ptr + 12, 'i32')
    for (let i = 0; i < errorcount; i++) {
      const base = errptr + i * 24
      const msgptr = module.getValue(base + 16, 'i32')
      errors.push({
        offset: module.getValue(base, 'i32'),
        line: module.getValue(base + 4, 'i32'),
        column: module.getValue(base + 8, 'i32'),
        length: module.getValue(base + 12, 'i32'),
        message: module.UTF8ToString(msgptr),
      })
    }
  }

  const result = {
    source: sourceptr ? module.UTF8ToString(sourceptr) : '',
    sourcemap: mapptr ? module.UTF8ToString(mapptr) : '',
    labelsjson: labelsptr ? module.UTF8ToString(labelsptr) : '',
    errors,
  }

  freefn(ptr)
  return result
}

export function wasmartifactsmissing() {
  try {
    readFileSync(path.join(WADIR, 'zss_lang.wasm'))
    readFileSync(path.join(WADIR, 'zss_lang.js'))
    return false
  } catch {
    return true
  }
}
