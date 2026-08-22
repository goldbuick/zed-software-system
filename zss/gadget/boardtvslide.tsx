import { useFrame } from '@react-three/fiber'
import { type ReactNode, useLayoutEffect, useRef } from 'react'
import { Group } from 'three'
import { ispresent } from 'zss/mapping/types'
import {
  SLIDE_CLOSE_FAILSAFE_MS,
  SLIDE_CLOSE_VELOCITY,
  SLIDE_OPEN_VELOCITY,
  animpositiontotarget,
  animsnapy,
} from 'zss/screens/scroll/anim'

export type BoardTvSlideProps = {
  shouldclose: boolean
  /** Local-Y off-screen edge (negative = below mount). */
  edgeoff: number
  onclosed: () => void
  children: ReactNode
}

function seedy(group: Group, value: number) {
  group.position.y = value
  group.userData.y = value
  group.userData.vy = 0
}

/**
 * Board-local Y slide for the TV mount. Same damp lifecycle as PanelSlide,
 * without viewport-edge math (TV lives in board space).
 */
export function BoardTvSlide({
  shouldclose,
  edgeoff,
  onclosed,
  children,
}: BoardTvSlideProps) {
  const groupref = useRef<Group>(null)
  const closedref = useRef(false)
  const wasclosedref = useRef(true)
  const edgeoffref = useRef(animsnapy(edgeoff))
  const onclosedref = useRef(onclosed)
  onclosedref.current = onclosed
  const snapped = animsnapy(edgeoff)

  function finishclose() {
    if (closedref.current) {
      return
    }
    closedref.current = true
    onclosedref.current()
  }

  useLayoutEffect(() => {
    edgeoffref.current = snapped
    if (shouldclose) {
      wasclosedref.current = true
      closedref.current = false
      return
    }
    if (wasclosedref.current && groupref.current) {
      wasclosedref.current = false
      seedy(groupref.current, snapped)
    }
  }, [shouldclose, snapped])

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
    if (animpositiontotarget(groupref.current, 'y', target, delta, velocity)) {
      if (shouldclose) {
        finishclose()
      }
    }
  })

  return <group ref={groupref}>{children}</group>
}
