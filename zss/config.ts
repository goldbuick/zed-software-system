import { CHAR_HEIGHT, CHAR_WIDTH } from './gadget/data/types'

function zssjsonbool(key: string): boolean {
  const raw = process.env[key]
  return !!JSON.parse(raw ?? 'false')
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

/**
 * Phase 3 perf flags - default ON for safe algorithmic swaps; OFF for changes
 * that alter behavior surface area. See zss/perf/README.md.
 */
function zssjsonboolwithdefault(key: string, defaultvalue: boolean): boolean {
  const raw = process.env[key]
  if (raw === undefined || raw === '') {
    return defaultvalue
  }
  try {
    return !!JSON.parse(raw)
  } catch {
    return defaultvalue
  }
}
/** Spatial-index lookup in memoryupdatedrawdirty allowids construction. */
const PERF_SPATIAL_INDEX = zssjsonboolwithdefault(
  'ZSS_PERF_SPATIAL_INDEX',
  true,
)
/** Incremental gadget layer rebuild tied to drawallowids (experimental). */
const PERF_INCREMENTAL_LAYERS = zssjsonboolwithdefault(
  'ZSS_PERF_INCREMENTAL_LAYERS',
  false,
)
/** Partial tile texture uploads via texSubImage2D dirty rows. */
const PERF_TILE_SUBIMAGE = zssjsonboolwithdefault(
  'ZSS_PERF_TILE_SUBIMAGE',
  false,
)
/** Per-script WASM modules instead of new Function() for CHIP logic. */
const WASM_SCRIPT = zssjsonboolwithdefault(
  'ZSS_WASM_SCRIPT',
  process.env.NODE_ENV !== 'production',
)

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
  PERF_SPATIAL_INDEX,
  PERF_INCREMENTAL_LAYERS,
  PERF_TILE_SUBIMAGE,
  WASM_SCRIPT,
}
