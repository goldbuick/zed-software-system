/** Map helper mediaqueue:status strings to short HUD / badge labels. */
export function mediaqueuestatusworklabel(
  status: string,
  detail?: string,
): string {
  if (status === 'queue-probe') {
    // A playlist scan reports `index/total title`; a single add sends its url.
    const scan = /^(\d+)\/(\d+)/.exec((detail ?? '').trim())
    if (scan) {
      return `media ${scan[1]}/${scan[2]}`
    }
    return 'media request'
  }
  if (status === 'downloading') {
    return 'media fetch'
  }
  if (status === 'extracting') {
    return 'media extract'
  }
  if (status === 'download-progress') {
    const parts = (detail ?? '').split('|')
    const pct = Number(parts[0])
    if (Number.isFinite(pct)) {
      return pct >= 99 ? 'media process' : `media ${Math.round(pct)}%`
    }
    return 'media fetch'
  }
  if (status === 'transcoding') {
    return 'media process'
  }
  if (status === 'buffering') {
    return 'media buffer'
  }
  if (status === 'playing') {
    return ''
  }
  return ''
}
