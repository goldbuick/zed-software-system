const WADIR = '/wasm/lang/'

export async function createlangmodule() {
  const factory = (
    await import(/* @vite-ignore */ `${WADIR}zss_lang.js`)
  ).default
  const wasmBinary = await fetch(`${WADIR}zss_lang.wasm`).then((response) =>
    response.arrayBuffer(),
  )
  return factory({
    wasmBinary,
    locateFile: (file: string) => `${WADIR}${file}`,
  })
}

type LangModule = Awaited<ReturnType<typeof createlangmodule>>

export function compilezssonmodule(
  name: string,
  source: string,
  module: LangModule,
) {
  const compilefn = module.cwrap('zss_compile', 'number', ['string', 'string'])
  const freefn = module.cwrap('zss_compile_result_free', null, ['number'])

  const ptr = compilefn(name, source)
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
    wasmbytes = new Uint8Array(wasmlen)
    wasmbytes.set(module.HEAPU8.subarray(wasmptr, wasmptr + wasmlen))
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
