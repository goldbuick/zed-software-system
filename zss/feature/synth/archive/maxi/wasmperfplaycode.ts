/** Baked into WASM play code at build time. Default-on unless ZSS_WASM_PERF=false. */
const perfon = process.env.ZSS_WASM_PERF !== 'false'

export const WASM_PERF_BOOTSTRAP = `var WASM_PERF_MODE = ${perfon ? 1 : 0};`
