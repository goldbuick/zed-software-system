import { CHAR_HEIGHT, CHAR_WIDTH } from './gadget/data/types'

// cli config
const LANG_DEV = !!JSON.parse(import.meta.env.ZSS_LANG_DEV)
const LANG_TYPES = !!JSON.parse(import.meta.env.ZSS_LANG_TYPES)
const STATS_DEV = !!JSON.parse(import.meta.env.ZSS_STATS_DEV)
const SHOW_CODE = !!JSON.parse(import.meta.env.ZSS_SHOW_CODE)
const TRACE_CODE = `${import.meta.env.ZSS_TRACE_CODE}`
const LOG_DEBUG = !!JSON.parse(import.meta.env.ZSS_LOG_DEBUG)
const FORCE_CRT_OFF = !!JSON.parse(import.meta.env.ZSS_FORCE_CRT_OFF)
const FORCE_LOW_REZ = !!JSON.parse(import.meta.env.ZSS_FORCE_LOW_REZ)
const FORCE_TOUCH_UI = !!JSON.parse(import.meta.env.ZSS_FORCE_TOUCH_UI)

// runtime config
export const RUNTIME = {
  // adjust time spent on code
  HALT_AT_COUNT: 1024 + 128,
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
  STATS_DEV,
  SHOW_CODE,
  TRACE_CODE,
  LOG_DEBUG,
  FORCE_CRT_OFF,
  FORCE_LOW_REZ,
  FORCE_TOUCH_UI,
}
