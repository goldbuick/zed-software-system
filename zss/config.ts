// cli config
const LANG_DEV = !!(import.meta.env.VITE_LANG_DEV !== undefined)
const STATS_DEV = !!(import.meta.env.VITE_STATS_DEV !== undefined)
const SHOW_CODE = !!(import.meta.env.VITE_SHOW_CODE !== undefined)

export { LANG_DEV, STATS_DEV, SHOW_CODE }
