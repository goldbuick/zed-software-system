import { useEffect, useRef } from 'react'
import {
  bindwanixparentmessage,
  setwanixchildwindow,
} from 'zss/feature/wanix/wanixbridge'

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
        opacity: 0.5,
        position: 'fixed',
        top: 0,
        left: 0, // -99999,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
