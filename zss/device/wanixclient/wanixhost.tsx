import { useEffect, useRef } from 'react'

import {
  bindwanixparentmessage,
  clearwanixchildwindowifcurrent,
  setwanixchildwindow,
} from './wanixbridge'

const SHOW = false
const GHOST = true

export function WanixHost() {
  const iframeref = useRef<HTMLIFrameElement>(null)

  useEffect(() => bindwanixparentmessage(), [])

  // Bind contentWindow on mount and on every load. Cached /wanix.html can finish
  // before React attaches onLoad, leaving childwindow null while the iframe is
  // visible — drops then crash with "wanix iframe not loaded".
  useEffect(() => {
    const el = iframeref.current
    if (!el) {
      return
    }
    const bind = () => {
      const win = el.contentWindow
      if (win) {
        setwanixchildwindow(win)
      }
    }
    bind()
    el.addEventListener('load', bind)
    return () => {
      el.removeEventListener('load', bind)
      clearwanixchildwindowifcurrent(el.contentWindow)
    }
  }, [])

  return (
    <iframe
      ref={iframeref}
      title="wanix"
      src="/wanix.html"
      style={{
        border: 0,
        position: 'fixed',
        top: 0,
        width: '100%',
        height: '100%',
        opacity: SHOW || GHOST ? 0.5 : 1,
        left: SHOW || GHOST ? 0 : -99999,
        pointerEvents: GHOST ? 'none' : 'auto',
      }}
    />
  )
}
