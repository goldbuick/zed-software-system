// cli config
const LANG_DEV = !!JSON.parse(import.meta.env.ZSS_LANG_DEV)
const STATS_DEV = !!JSON.parse(import.meta.env.ZSS_STATS_DEV)
const SHOW_CODE = !!JSON.parse(import.meta.env.ZSS_SHOW_CODE)
const TRACE_CODE = `${import.meta.env.ZSS_TRACE_CODE}`
const LOG_DEBUG = !!JSON.parse(import.meta.env.ZSS_LOG_DEBUG)

export { LANG_DEV, STATS_DEV, SHOW_CODE, TRACE_CODE, LOG_DEBUG }
