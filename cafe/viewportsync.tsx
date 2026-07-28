import { useStore } from '@react-three/fiber'
import debounce from 'debounce'
import { useLayoutEffect } from 'react'
import { RUNTIME } from 'zss/config'
import { forcer3fglresize } from 'zss/gadget/canvasrelayout'
import { useDeviceData } from 'zss/gadget/device'
import { makeeven } from 'zss/mapping/number'

function readframebox(): { width: number; height: number } {
  const frame = document.getElementById('frame')
  if (frame) {
    const rect = frame.getBoundingClientRect()
    return {
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height)),
    }
  }
  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  }
}

function applyviewport(store: ReturnType<typeof useStore>) {
  // Match #frame (fixed inset 0 on the layout viewport with viewport-fit=cover).
  const box = readframebox()
  const width = makeeven(box.width)
  const height = makeeven(box.height)
  // saferows: visible band above soft keyboard (portrait typing layout only).
  const safeheight = window.visualViewport
    ? Math.min(box.height, Math.floor(window.visualViewport.height))
    : box.height
  const saferows = Math.floor(safeheight / RUNTIME.DRAW_CHAR_HEIGHT())
  useDeviceData.setState({ saferows })

  const { size } = store.getState()
  if (size.width !== width || size.height !== height) {
    store.getState().setSize(width, height, size.top, size.left)
  }
  forcer3fglresize(store)
}

export function ViewportSync() {
  const store = useStore()

  useLayoutEffect(() => {
    const syncnow = () => {
      applyviewport(store)
    }
    const syncdebounced = debounce(syncnow, 256)

    syncnow()
    requestAnimationFrame(syncnow)

    window.addEventListener('resize', syncdebounced)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncnow)
      window.visualViewport.addEventListener('scroll', syncnow)
    }

    const frame = document.getElementById('frame')
    const ro =
      frame && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            syncnow()
          })
        : undefined
    if (frame && ro) {
      ro.observe(frame)
    }

    return () => {
      syncdebounced.clear()
      window.removeEventListener('resize', syncdebounced)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', syncnow)
        window.visualViewport.removeEventListener('scroll', syncnow)
      }
      ro?.disconnect()
    }
  }, [store])

  return null
}
