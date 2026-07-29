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
  const safeheight = window.visualViewport
    ? Math.min(innerheight, window.visualViewport.height)
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
    const sync = debounce(() => {
      applyviewport(store)
    }, 256)

    sync()
    requestAnimationFrame(() => {
      sync()
    })

    window.addEventListener('resize', sync)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', sync)
      window.visualViewport.addEventListener('scroll', sync)
    }

    return () => {
      sync.clear()
      window.removeEventListener('resize', sync)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', sync)
        window.visualViewport.removeEventListener('scroll', sync)
      }
    }
  }, [store])

  return null
}
