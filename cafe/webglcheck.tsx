import { useEffect } from 'react'
import { bootstrapmobiletextcapture } from 'zss/gadget/mobiletextcapture'

function detectwebgl(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')
    return !!(window.WebGLRenderingContext && gl)
  } catch {
    return false
  }
}

function WebGLRequired() {
  return (
    <div id="webgl-required">
      <p>WebGL is not enabled or not supported.</p>
      <p>
        <a
          href="https://get.webgl.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Check WebGL support
        </a>
      </p>
    </div>
  )
}

export function WebGLCheck({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    bootstrapmobiletextcapture()
  }, [])

  if (!detectwebgl()) {
    return <WebGLRequired />
  }

  return children
}
