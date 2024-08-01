// cli config
const LANG_DEV = !!JSON.parse(import.meta.env.ZSS_LANG_DEV)
const LANG_TYPES = !!JSON.parse(import.meta.env.ZSS_LANG_TYPES)
const STATS_DEV = !!JSON.parse(import.meta.env.ZSS_STATS_DEV)
const SHOW_CODE = !!JSON.parse(import.meta.env.ZSS_SHOW_CODE)
const TRACE_CODE = `${import.meta.env.ZSS_TRACE_CODE}`
const LOG_DEBUG = !!JSON.parse(import.meta.env.ZSS_LOG_DEBUG)
const FORCE_CRT_OFF = !!JSON.parse(import.meta.env.ZSS_FORCE_CRT_OFF)

export {
  LANG_DEV,
  LANG_TYPES,
  STATS_DEV,
  SHOW_CODE,
  TRACE_CODE,
  LOG_DEBUG,
  FORCE_CRT_OFF,
}
