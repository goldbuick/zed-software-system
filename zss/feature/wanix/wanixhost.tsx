import { useEffect, useRef } from 'react'
import {
  bindwanixparentmessage,
  setwanixchildwindow,
} from 'zss/feature/wanix/wanixbridge'

const SHOW = false
const GHOST = true

export function WanixHost() {
  const iframeref = useRef<HTMLIFrameElement>(null)

  useEffect(() => bindwanixparentmessage(), [])

  const onload = () => {
    setwanixchildwindow(iframeref.current?.contentWindow ?? null)
  }

  return (
    <iframe
      ref={iframeref}
      title="wanix"
      src="/wanix.html"
      onLoad={onload}
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
