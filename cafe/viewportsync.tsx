import { useStore } from '@react-three/fiber'
import debounce from 'debounce'
import { useLayoutEffect } from 'react'
import { RUNTIME } from 'zss/config'
import { forcer3fglresize } from 'zss/gadget/canvasrelayout'
import { useDeviceData } from 'zss/gadget/device'
import { makeeven } from 'zss/mapping/number'

let lastloggedsaferows = -1

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
  const capturefocused = useDeviceData.getState().textcapturefocused
  if (saferows !== lastloggedsaferows) {
    lastloggedsaferows = saferows
    // eslint-disable-next-line no-console -- soft-keyboard probe (filter [softkb)
    console.info('[softkb H6] viewport:saferows', {
      t: Date.now(),
      saferows,
      safeheight,
      innerheight,
      capturefocused,
      skipped: capturefocused,
      vvH: window.visualViewport
        ? Math.round(window.visualViewport.height)
        : null,
    })
  }
  // While the Tier A field is focused, do not push saferows into zustand.
  // That re-render flips showactionrow and still blurs the textarea on iOS
  // even with a stable dock (softkb: focus -> vvH drop -> capture:dom-blur,
  // no gl-resize). Sync again on blur when visualViewport restores.
  if (!capturefocused) {
    useDeviceData.setState({ saferows })
  }

  // Soft keyboard only changes visualViewport.height (saferows). window.inner*
  // stays put. Always calling forcer3fglresize here thrashes the WebGL canvas
  // and blurs the Tier A textarea (Safari softkb logs).
  const { size } = store.getState()
  const sizechanged = size.width !== width || size.height !== height
  if (sizechanged) {
    store.getState().setSize(width, height, size.top, size.left)
    forcer3fglresize(store)
    // eslint-disable-next-line no-console -- soft-keyboard probe (filter [softkb)
    console.info('[softkb H6] viewport:gl-resize', {
      t: Date.now(),
      width,
      height,
      prevW: size.width,
      prevH: size.height,
    })
  }
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
    // Do not sync on textcapturefocused: focusing the Tier A field then
    // forcer3fglresize dismisses the iOS soft keyboard before it can open.
    // visualViewport resize/scroll already updates saferows when the KB appears.
    window.addEventListener('resize', syncdebounced)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncnow)
      window.visualViewport.addEventListener('scroll', syncnow)
    }

    return () => {
      syncdebounced.clear()
      window.removeEventListener('resize', syncdebounced)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', syncnow)
        window.visualViewport.removeEventListener('scroll', syncnow)
      }
    }
  }, [store])

  return null
}
