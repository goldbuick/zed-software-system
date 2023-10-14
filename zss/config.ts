function getUrlParam(name: string) {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(name)
}

function paramIsEnabled(name: string) {
  return getUrlParam(name) !== null
}

const LANG_DEV = paramIsEnabled('lang')
const STATS_DEV = paramIsEnabled('stats')
const SHOW_CODE = paramIsEnabled('code')

export { LANG_DEV, STATS_DEV, SHOW_CODE }
