import { LANG_BUILD_ID } from 'zss/feature/lang/backend/wasm/langbuildid'

const WADIR = '/wasm/lang/'
const WAQS = `v=${LANG_BUILD_ID}`

export async function createlangmodule() {
  const factory = (
    await import(/* @vite-ignore */ `${WADIR}zss_lang.js?${WAQS}`)
  ).default
  const wasmBinary = await fetch(`${WADIR}zss_lang.wasm?${WAQS}`).then(
    (response) => response.arrayBuffer(),
  )
  return factory({
    wasmBinary,
    locateFile: (file: string) => `${WADIR}${file}?${WAQS}`,
  })
}

type LangModule = Awaited<ReturnType<typeof createlangmodule>>

function readheapbytes(module: LangModule, ptr: number, len: number) {
  const heap = module.HEAPU8
  if (heap) {
    return heap.subarray(ptr, ptr + len)
  }
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = module.getValue(ptr + i, 'i8') & 0xff
  }
  return bytes
}

export function compilezssonmodule(
  name: string,
  source: string,
  module: LangModule,
) {
  const compilefn = module.cwrap('zss_compile', 'number', ['string', 'string'])
  const freefn = module.cwrap('zss_compile_result_free', null, ['number'])

  let ptr = 0
  try {
    ptr = compilefn(name, source)
  } catch (err) {
    return {
      wasmbytes: new Uint8Array(0),
      labelsjson: '',
      debugmap: '',
      importmanifest: '',
      errors: [
        {
          offset: 0,
          line: 0,
          column: 0,
          length: 0,
          message: `wasm compiler aborted: ${String(err)}`,
        },
      ],
    }
  }
  const labelsptr = module.getValue(ptr + 8, 'i32')
  const wasmptr = module.getValue(ptr + 12, 'i32')
  const wasmlen = module.getValue(ptr + 16, 'i32')
  const debugptr = module.getValue(ptr + 20, 'i32')
  const manifestptr = module.getValue(ptr + 24, 'i32')
  const errorcount = module.getValue(ptr + 32, 'i32')

  const errors = []
  if (errorcount > 0) {
    const errptr = module.getValue(ptr + 28, 'i32')
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

  let wasmbytes = new Uint8Array(0)
  if (wasmptr && wasmlen > 0) {
    wasmbytes = new Uint8Array(readheapbytes(module, wasmptr, wasmlen))
  }

  const result = {
    wasmbytes,
    labelsjson: labelsptr ? module.UTF8ToString(labelsptr) : '',
    debugmap: debugptr ? module.UTF8ToString(debugptr) : '',
    importmanifest: manifestptr ? module.UTF8ToString(manifestptr) : '',
    errors,
  }

  freefn(ptr)
  return result
}
