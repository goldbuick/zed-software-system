import { CHAR_HEIGHT, CHAR_WIDTH } from './gadget/data/types'

/* eslint-disable @typescript-eslint/prefer-optional-chain -- typeof guard needed for Node */
const env =
  typeof import.meta !== 'undefined' && import.meta?.env
    ? import.meta.env
    : (process?.env ?? {})
/* eslint-enable @typescript-eslint/prefer-optional-chain */

function envBool(key: string) {
  return !!JSON.parse(env[key] ?? 'false')
}
function envStr(key: string) {
  return `${env[key] ?? ''}`
}

// cli config
const LANG_DEV = envBool('ZSS_LANG_DEV')
const LANG_TYPES = envBool('ZSS_LANG_TYPES')
const STATS_DEV = envBool('ZSS_STATS_DEV')
const SHOW_CODE = envBool('ZSS_SHOW_CODE')
const TRACE_CODE = envStr('ZSS_TRACE_CODE')
const LOG_DEBUG = envBool('ZSS_LOG_DEBUG')
const FORCE_CRT_OFF = envBool('ZSS_FORCE_CRT_OFF')
const FORCE_LOW_REZ = envBool('ZSS_FORCE_LOW_REZ')
const FORCE_TOUCH_UI = envBool('ZSS_FORCE_TOUCH_UI')

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
  STATS_DEV,
  SHOW_CODE,
  TRACE_CODE,
  LOG_DEBUG,
  FORCE_CRT_OFF,
  FORCE_LOW_REZ,
  FORCE_TOUCH_UI,
}
