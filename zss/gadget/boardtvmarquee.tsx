import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import {
  BOARD_TV_INNER_COLS,
  BOARD_TV_ROWS,
} from 'zss/feature/mediaqueue/constants'
import { boardtvmarqueewindow } from 'zss/gadget/boardtvmarqueewindow'
import { resettiles, useTiles, writetile } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { SCROLL_SPEED } from 'zss/screens/scroll/marqueebuffer'
import { COLOR } from 'zss/words/types'

const MARQUEE_FG = COLOR.PURPLE
const MARQUEE_BG = COLOR.BLACK

type BoardTvMarqueeProps = {
  label: string
  drawwidth: number
  drawheight: number
  tvdrawwidth: number
  tvdrawheight: number
  z: number
}

export function BoardTvMarquee({
  label,
  drawwidth,
  drawheight,
  tvdrawwidth,
  tvdrawheight,
  z,
}: BoardTvMarqueeProps) {
  const store = useTiles(
    BOARD_TV_INNER_COLS,
    1,
    0,
    MARQUEE_FG,
    MARQUEE_BG,
  )
  const acc = useRef(0)
  const offset = useRef(0)
  const lastdrawn = useRef('')

  function drawmarquee(nextoffset: number) {
    const trimmed = label.trim()
    if (!trimmed) {
      const state = store.getState()
      resettiles(state, 0, MARQUEE_FG, MARQUEE_BG)
      state.changed()
      lastdrawn.current = ''
      return
    }
    const window = boardtvmarqueewindow(trimmed, nextoffset)
    const drawkey = `${nextoffset}|${window}`
    if (drawkey === lastdrawn.current) {
      return
    }
    lastdrawn.current = drawkey
    const state = store.getState()
    resettiles(state, 0, MARQUEE_FG, MARQUEE_BG)
    for (let i = 0; i < window.length; ++i) {
      writetile(state, BOARD_TV_INNER_COLS, 1, i, 0, {
        char: window.charCodeAt(i),
        color: MARQUEE_FG,
        bg: MARQUEE_BG,
      })
    }
    state.changed()
  }

  useEffect(() => {
    offset.current = 0
    acc.current = 0
    lastdrawn.current = ''
    drawmarquee(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label])

  useFrame((_, delta) => {
    if (!label.trim()) {
      return
    }
    acc.current += delta
    if (acc.current < SCROLL_SPEED) {
      return
    }
    acc.current %= SCROLL_SPEED
    offset.current -= 1
    drawmarquee(offset.current)
  })

  if (!label.trim()) {
    return null
  }

  const x = -tvdrawwidth * 0.5 + drawwidth
  const y = -tvdrawheight * 0.5 + (BOARD_TV_ROWS - 1) * drawheight

  return (
    <group position={[x, y, z]}>
      <TilesData store={store}>
        <TilesRender
          label="board-tv-marquee"
          width={BOARD_TV_INNER_COLS}
          height={1}
          skipraycast
          mediasource="board"
        />
      </TilesData>
    </group>
  )
}
