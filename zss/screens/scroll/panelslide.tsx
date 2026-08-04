import { useFrame, useThree } from '@react-three/fiber'
import { type ReactNode, useLayoutEffect, useRef } from 'react'
import { Group } from 'three'
import { ispresent } from 'zss/mapping/types'
import {
  animpositiontotarget,
  animsnapx,
  animsnapy,
} from 'zss/screens/scroll/anim'

// 4th arg to animpositiontotarget / maath damp: higher is faster with our
// maxSpeed + rsqw setup (open ~160ms at 2.8; close ~425ms at 1.4).
const SLIDE_OPEN_VELOCITY = 2.8
const SLIDE_CLOSE_VELOCITY = 1.4
const SLIDE_CLOSE_FAILSAFE_MS = 5000

export type PanelSlideProps = {
  shouldclose: boolean
  /** BOTTOM enters/exits from below; TOP/FULL from above. Ignored when fromleft. */
  frombottom?: boolean
  /** Enter/exit from the left (X axis). */
  fromleft?: boolean
  onclosed: () => void
  children: ReactNode
}

function readoffscreen(
  viewport: { width: number; height: number },
  fromleft: boolean,
  frombottom: boolean,
) {
  // Match animpositiontotarget snap so completion can reach < 0.1.
  if (fromleft) {
    return animsnapx(-viewport.width)
  }
  return animsnapy(frombottom ? viewport.height : -viewport.height)
}

function seedaxis(group: Group, axis: 'x' | 'y', value: number) {
  group.position[axis] = value
  group.userData[axis] = value
  group.userData[`v${axis}`] = 0
}

/** Layout-aware slide: Y for top/bottom, X when fromleft. */
export function PanelSlide({
  shouldclose,
  frombottom = false,
  fromleft = false,
  onclosed,
  children,
}: PanelSlideProps) {
  const { viewport } = useThree()
  const groupref = useRef<Group>(null)
  const closedref = useRef(false)
  const wasclosedref = useRef(true)
  const edgeoffref = useRef(0)
  const onclosedref = useRef(onclosed)
  onclosedref.current = onclosed
  const axis = fromleft ? 'x' : 'y'
  const off = readoffscreen(viewport, fromleft, frombottom)

  function finishclose() {
    if (closedref.current) {
      return
    }
    closedref.current = true
    onclosedref.current()
  }

  // Seed via ref only — do not bind position-* props (React commits would
  // snap back to off-screen and skip the exit damp, e.g. perf panel refresh).
  useLayoutEffect(() => {
    if (shouldclose) {
      wasclosedref.current = true
      closedref.current = false
      edgeoffref.current = off
      return
    }
    if (wasclosedref.current && groupref.current) {
      wasclosedref.current = false
      edgeoffref.current = off
      seedaxis(groupref.current, axis, off)
    }
  }, [shouldclose, off, axis])

  // If damp never settles (or tab is backgrounded), do not leave focus stuck.
  useLayoutEffect(() => {
    if (!shouldclose) {
      return
    }
    const timer = setTimeout(finishclose, SLIDE_CLOSE_FAILSAFE_MS)
    return () => clearTimeout(timer)
  }, [shouldclose])

  useFrame((_, delta) => {
    if (!ispresent(groupref.current)) {
      return
    }
    const target = shouldclose ? edgeoffref.current : 0
    const velocity = shouldclose ? SLIDE_CLOSE_VELOCITY : SLIDE_OPEN_VELOCITY
    if (animpositiontotarget(groupref.current, axis, target, delta, velocity)) {
      if (shouldclose) {
        finishclose()
      }
    }
  })

  return <group ref={groupref}>{children}</group>
}
