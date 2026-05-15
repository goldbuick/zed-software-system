import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group } from 'three'
import { RUNTIME } from 'zss/config'
import { resettiles, useTiles, writetile } from 'zss/gadget/tiles'
import { COLOR } from 'zss/words/types'

import { useTape } from './data/state'
import { useScreenSize } from './userscreen'
import { TilesData, TilesRender } from './usetiles'

const BADGE_W = 20
const BADGE_H = 1
const SPINNER = [249, 45, 43, 42, 42, 43, 45, 249]
const SPINNER_HZ = 6
const BADGE_FG = COLOR.YELLOW
const BADGE_BG = COLOR.DKBLUE

type HeavyStatusBadgeProps = {
  heavystatus: string
}

/** Subscribes to tape heavystatus so only this subtree re-renders on status change. */
export function HeavyStatusBadgeConnected() {
  const heavystatus = useTape((state) => state.heavystatus)
  return <HeavyStatusBadge heavystatus={heavystatus} />
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }
  if (max <= 3) {
    return text.slice(0, max)
  }
  return `${text.slice(0, max - 3)}...`
}

export function HeavyStatusBadge({ heavystatus }: HeavyStatusBadgeProps) {
  const screensize = useScreenSize()
  const groupref = useRef<Group>(null)
  const spinneraccum = useRef(0)
  const spinnerindex = useRef(0)
  const lastdrawnspin = useRef(-1)
  const lastdrawnstatus = useRef('')

  const store = useTiles(BADGE_W, BADGE_H, 0, BADGE_FG, BADGE_BG)

  function drawbadge(spin: number, status: string) {
    const state = store.getState()
    resettiles(state, 0, BADGE_FG, BADGE_BG)
    if (!status) {
      state.changed()
      return
    }
    // spinner glyph in col 0
    writetile(state, BADGE_W, BADGE_H, 0, 0, {
      char: SPINNER[spin] ?? 0,
      color: BADGE_FG,
      bg: BADGE_BG,
    })
    // 18 chars of detail starting at col 2
    const detail = truncate(status, BADGE_W - 2)
    for (let i = 0; i < detail.length; ++i) {
      writetile(state, BADGE_W, BADGE_H, 2 + i, 0, {
        char: detail.charCodeAt(i),
        color: BADGE_FG,
        bg: BADGE_BG,
      })
    }
    state.changed()
  }

  useEffect(() => {
    drawbadge(spinnerindex.current, heavystatus)
    lastdrawnstatus.current = heavystatus
    lastdrawnspin.current = spinnerindex.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heavystatus])

  useFrame((_, delta) => {
    if (!heavystatus) {
      return
    }
    spinneraccum.current += delta * SPINNER_HZ
    while (spinneraccum.current >= 1) {
      spinneraccum.current -= 1
      spinnerindex.current = (spinnerindex.current + 1) % SPINNER.length
    }
    if (spinnerindex.current !== lastdrawnspin.current) {
      drawbadge(spinnerindex.current, heavystatus)
      lastdrawnspin.current = spinnerindex.current
    }
  })

  if (screensize.cols < BADGE_W + 2 || screensize.rows < 4) {
    return null
  }
  if (!heavystatus) {
    return null
  }

  const x = (screensize.cols - BADGE_W) * RUNTIME.DRAW_CHAR_WIDTH()
  const y = 0
  return (
    <group ref={groupref} position={[x, y, 999]}>
      <TilesData store={store}>
        <TilesRender label="heavystatus" width={BADGE_W} height={BADGE_H} />
      </TilesData>
    </group>
  )
}
