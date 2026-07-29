import { useStore } from '@react-three/fiber'
import debounce from 'debounce'
import { useLayoutEffect } from 'react'
import { RUNTIME } from 'zss/config'
import { forcer3fglresize } from 'zss/gadget/canvasrelayout'
import { useDeviceData } from 'zss/gadget/device'
import { makeeven } from 'zss/mapping/number'

function applyviewport(store: ReturnType<typeof useStore>) {
  const innerwidth = window.innerWidth
  const innerheight = window.innerHeight
  const width = makeeven(innerwidth)
  const height = makeeven(innerheight)
  // saferows: visible band above soft keyboard (portrait typing layout).
  const safeheight = window.visualViewport
    ? Math.min(innerheight, Math.floor(window.visualViewport.height))
    : innerheight
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

    // Debounce window resize; visualViewport must be immediate for keyboard.
    window.addEventListener('resize', syncdebounced)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncnow)
      window.visualViewport.addEventListener('scroll', syncnow)
    }

    const unsub = useDeviceData.subscribe((state, prev) => {
      if (state.textcapturefocused !== prev.textcapturefocused) {
        syncnow()
      }
    })

    return () => {
      syncdebounced.clear()
      window.removeEventListener('resize', syncdebounced)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', syncnow)
        window.visualViewport.removeEventListener('scroll', syncnow)
      }
      unsub()
    }
  }, [store])

  return null
}
