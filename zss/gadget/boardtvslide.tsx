import { useFrame } from '@react-three/fiber'
import { type ReactNode, useLayoutEffect, useRef } from 'react'
import { Group } from 'three'
import { ispresent } from 'zss/mapping/types'
import {
  SLIDE_OPEN_VELOCITY,
  animpositiontotarget,
  animsnapy,
} from 'zss/screens/scroll/anim'

export type BoardTvSlideProps = {
  /** Local-Y off-screen edge (negative = below mount). */
  edgeoff: number
  children: ReactNode
}

function seedy(group: Group, value: number) {
  group.position.y = value
  group.userData.y = value
  group.userData.vy = 0
}

/**
 * Board-local Y slide-in for the TV mount. Seeds off-screen once, damps to 0.
 * Hide is instant unmount (no slide-out).
 */
export function BoardTvSlide({ edgeoff, children }: BoardTvSlideProps) {
  const groupref = useRef<Group>(null)
  const seededref = useRef(false)
  const snapped = animsnapy(edgeoff)

  useLayoutEffect(() => {
    if (seededref.current || !groupref.current) {
      return
    }
    seededref.current = true
    seedy(groupref.current, snapped)
  }, [snapped])

  useFrame((_, delta) => {
    if (!ispresent(groupref.current)) {
      return
    }
    animpositiontotarget(
      groupref.current,
      'y',
      0,
      delta,
      SLIDE_OPEN_VELOCITY,
    )
  })

  return <group ref={groupref}>{children}</group>
}
