import {
  installwanixtermprobe,
  installwanixtermprobeembed,
} from 'zss/testsupport/wanix/wanixtermprobe'

export function runwanixtermprobeboot() {
  const embed =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('embed') === '1'
  const probe = embed ? installwanixtermprobeembed() : installwanixtermprobe()
  const w = window as Window & { __WANIX_TERM_PROBE__?: typeof probe }
  w.__WANIX_TERM_PROBE__ = probe
  return probe
}

runwanixtermprobeboot()
