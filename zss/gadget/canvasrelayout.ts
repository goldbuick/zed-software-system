import type { RootState } from '@react-three/fiber'
import type { StoreApi } from 'zustand'
import { isclimode } from 'zss/feature/detect'
import { isjoin } from 'zss/feature/url'
import { createplatform, haltplatform } from 'zss/platform'

/** Bumped after a forced GL resize so EffectComposer resets throttled `setSize`. */
export let canvassyncgeneration = 0

let r3fstore: StoreApi<RootState> | undefined
let lostglcontext: WEBGL_lose_context | null = null
let detachedframe: HTMLCanvasElement | null = null
let frameparent: HTMLElement | null = null
let frameslot: Node | null = null
let platformhaltedforvm = false

export function registerr3fstore(store: StoreApi<RootState> | undefined) {
  r3fstore = store
  if (typeof window !== 'undefined') {
    ;(window as Window & { __zss_r3f_ready?: boolean }).__zss_r3f_ready =
      store != null
  }
}

/** Pause gadget WebGL while v86/gojs boots (avoids wasm DataView panic on full app). */
export function pausegadgetframeloop() {
  r3fstore?.getState().setFrameloop('never')
}

export function resumegadgetframeloop() {
  r3fstore?.getState().setFrameloop('always')
}

async function waitforpaintidle() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

/** Release parent WebGL while iframe VM runs (shared GPU driver conflict with gojs). */
export function releasegadgetglcontext() {
  pausegadgetframeloop()
  const renderer = r3fstore?.getState().gl
  if (renderer) {
    try {
      renderer.forceContextLoss()
    } catch {
      // context may already be lost
    }
  }
  const frame = document.getElementById('frame') as HTMLCanvasElement | null
  if (!frame) {
    return
  }
  frame.style.display = 'none'
  frame.style.visibility = 'hidden'
  frame.style.pointerEvents = 'none'
  const gl = frame.getContext('webgl2') ?? frame.getContext('webgl')
  if (!gl) {
    return
  }
  lostglcontext = gl.getExtension('WEBGL_lose_context')
  lostglcontext?.loseContext()
}

/** Detach gadget canvas from DOM so embed gojs does not share an active WebGL context. */
export function detachgadgetcanvas() {
  releasegadgetglcontext()
  if (!platformhaltedforvm) {
    haltplatform()
    platformhaltedforvm = true
  }
  const frame = document.getElementById('frame') as HTMLCanvasElement | null
  if (!frame?.parentElement || detachedframe) {
    return
  }
  frameparent = frame.parentElement
  frameslot = frame.nextSibling
  detachedframe = frame
  frameparent.removeChild(frame)
}

export function restoregadgetglcontext() {
  if (detachedframe && frameparent && !document.getElementById('frame')) {
    if (frameslot && frameslot.parentElement === frameparent) {
      frameparent.insertBefore(detachedframe, frameslot)
    } else {
      frameparent.appendChild(detachedframe)
    }
  }
  detachedframe = null
  frameparent = null
  frameslot = null

  const frame = document.getElementById('frame') as HTMLCanvasElement | null
  if (frame) {
    frame.style.removeProperty('display')
    frame.style.removeProperty('visibility')
    frame.style.removeProperty('pointer-events')
  }

  lostglcontext?.restoreContext()
  lostglcontext = null
  if (platformhaltedforvm) {
    createplatform(isjoin(), isclimode())
    platformhaltedforvm = false
  }
  forcer3fglresize(r3fstore)
  resumegadgetframeloop()
}

/** Full gadget GL suspend before opening embed VM host (popup / iframe). */
export async function suspendgadgetglcontext() {
  detachgadgetcanvas()
  await waitforpaintidle()
}

function bumpcanvassyncgeneration() {
  canvassyncgeneration += 1
}

/**
 * R3F skips `setSize` when `configure` size equals current state, so `gl.setSize`
 * never runs (see pmndrs/react-three-fiber store subscription). Nudge dimensions
 * so the subscriber refreshes canvas + camera after graphics-mode swaps.
 */
export function forcer3fglresize(store: StoreApi<RootState> | undefined) {
  if (!store) {
    return
  }
  const s = store.getState()
  const { width, height, top, left } = s.size
  if (width < 2 || height < 1) {
    return
  }
  s.setSize(width - 1, height, top, left)
  s.setSize(width, height, top, left)
  bumpcanvassyncgeneration()
}
