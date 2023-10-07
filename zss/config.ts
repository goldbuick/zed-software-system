function getUrlParam(name: string) {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(name)
}

function paramIsEnabled(name: string) {
  return getUrlParam(name) !== null
}

const LANG_DEV = paramIsEnabled('lang')
const STATS_DEV = paramIsEnabled('stats')

export { LANG_DEV, STATS_DEV }
