// browser config
// welp this gets complicated because of the web worker
const params: Record<string, any> = {}
// if (typeof window !== undefined) {
//   const urlParams = new URLSearchParams(window.location.search)
//   for (const [key, value] of urlParams) {
//     params[key] = value
//   }
// }

// cli config
const LANG_DEV = !!(process.env.LANG_DEV !== undefined || params.LANG_DEV)
const STATS_DEV = !!(process.env.STATS_DEV !== undefined || params.STATS_DEV)
const SHOW_CODE = !!(process.env.SHOW_CODE !== undefined || params.SHOW_CODE)

export { LANG_DEV, STATS_DEV, SHOW_CODE }
