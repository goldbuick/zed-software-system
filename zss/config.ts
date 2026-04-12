import { CHAR_HEIGHT, CHAR_WIDTH } from './gadget/data/types'

function zssjsonbool(key: string): boolean {
  const raw = process.env[key] ?? 'false'
  return !!JSON.parse(raw)
}

// cli config (Jest uses `process.env`; Vite inlines via `define` in vite.config.ts)
const LANG_DEV = zssjsonbool('ZSS_DEBUG_LANG_DEV')
const LANG_TYPES = zssjsonbool('ZSS_DEBUG_LANG_TYPES')
const PERF_UI = zssjsonbool('ZSS_DEBUG_PERF_UI')
const SHOW_CODE = zssjsonbool('ZSS_DEBUG_SHOW_CODE')
const TRACE_CODE = `${process.env.ZSS_DEBUG_TRACE_CODE ?? ''}`
const LOG_DEBUG = zssjsonbool('ZSS_DEBUG_LOG')
const FORCE_CRT_OFF = zssjsonbool('ZSS_FORCE_CRT_OFF')
const FORCE_LOW_REZ = zssjsonbool('ZSS_FORCE_LOW_REZ')
const FORCE_TOUCH_UI = zssjsonbool('ZSS_FORCE_TOUCH_UI')
/** Inspector pick plane: magenta hit dot + tile-snapped wireframe box (see `InspectorSelect`). */
const RAYCAST_DEBUG_DOT = zssjsonbool('ZSS_DEBUG_RAYCAST_DOT')
/** Inspector: wireframe pick sheet + colored selection quads (see `InspectorSelect`). */
const RAYCAST_DEBUG_PICKSHEET = zssjsonbool('ZSS_DEBUG_RAYCAST_PICKSHEET')
/** Flat ortho: assert board fills frustum on cropped axes (see `flatcameradevassertboardinortho`). */
const FLAT_CAMERA_ORTHO_ASSERT = zssjsonbool('ZSS_DEBUG_FLAT_CAMERA_ORTHO')

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
  RAYCAST_DEBUG_DOT,
  RAYCAST_DEBUG_PICKSHEET,
  FLAT_CAMERA_ORTHO_ASSERT,
}
