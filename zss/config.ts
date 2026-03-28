import { CHAR_HEIGHT, CHAR_WIDTH } from './gadget/data/types'

function zssjsonbool(key: string): boolean {
  const raw = process.env[key] ?? 'false'
  return !!JSON.parse(raw)
}

// cli config (Jest uses `process.env`; Vite inlines via `define` in vite.config.ts)
const LANG_DEV = zssjsonbool('ZSS_LANG_DEV')
const LANG_TYPES = zssjsonbool('ZSS_LANG_TYPES')
const PERF_UI = zssjsonbool('ZSS_PERF_UI')
const SHOW_CODE = zssjsonbool('ZSS_SHOW_CODE')
const TRACE_CODE = `${process.env.ZSS_TRACE_CODE ?? ''}`
const LOG_DEBUG = zssjsonbool('ZSS_LOG_DEBUG')
const FORCE_CRT_OFF = zssjsonbool('ZSS_FORCE_CRT_OFF')
const FORCE_LOW_REZ = zssjsonbool('ZSS_FORCE_LOW_REZ')
const FORCE_TOUCH_UI = zssjsonbool('ZSS_FORCE_TOUCH_UI')

// runtime config
export const RUNTIME = {
  // adjust time spent on code
  YIELD_AT_COUNT: 512,
  // render
  DRAW_CHAR_SCALE: 2,
  DRAW_CHAR_WIDTH() {
    return CHAR_WIDTH * RUNTIME.DRAW_CHAR_SCALE
  },
  DRAW_CHAR_HEIGHT() {
    return CHAR_HEIGHT * RUNTIME.DRAW_CHAR_SCALE
  },
}

export {
  LANG_DEV,
  LANG_TYPES,
  PERF_UI,
  SHOW_CODE,
  TRACE_CODE,
  LOG_DEBUG,
  FORCE_CRT_OFF,
  FORCE_LOW_REZ,
  FORCE_TOUCH_UI,
}
