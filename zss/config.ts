// cli config
const LANG_DEV = !!JSON.parse(import.meta.env.ZSS_LANG_DEV)
const STATS_DEV = !!JSON.parse(import.meta.env.ZSS_STATS_DEV)
const SHOW_CODE = !!JSON.parse(import.meta.env.ZSS_SHOW_CODE)

export { LANG_DEV, STATS_DEV, SHOW_CODE }
