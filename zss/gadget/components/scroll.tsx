import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Group } from 'three'
import { animpositiontotarget } from 'zss/mapping/anim'
import { ispresent } from 'zss/mapping/types'

import {
  createwritetextcontext,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from '../data/textformat'
import {
  COLOR,
  DRAW_CHAR_HEIGHT,
  DRAW_CHAR_WIDTH,
  PANEL_ITEM,
} from '../data/types'

import { Panel } from './panel'
import { ScrollContext } from './panel/common'
import {
  DitherSnapshot,
  resetDither,
  useDither,
  writeDither,
} from './usedither'
import { UserFocus, UserInput, UserInputHandler } from './userinput'
import { TileSnapshot, useTiles, writeTile } from './usetiles'

type ScrollProps = {
  player: string
  name: string
  width: number
  height: number
  color: number
  bg: number
  text: PANEL_ITEM[]
  shouldclose: boolean
  didclose?: () => void
}

export function Scroll({
  player,
  name,
  width,
  height,
  color,
  bg,
  text,
  shouldclose,
}: ScrollProps) {
  const { viewport } = useThree()
  const panelwidth = width - 3
  const panelheight = height - 3
  const tiles = useTiles(width, height, 0, color, bg)
  const dither = useDither(panelwidth, panelheight)
  const scroll = useContext(ScrollContext)

  // edges
  for (let x = 1; x < width - 1; ++x) {
    writeTile(tiles, width, height, x, 0, { char: 196, color: 15 })
    if (x > 2 && x < width - 1) {
      writeTile(tiles, width, height, x, 1, { char: 205, color: 15 })
    }
    writeTile(tiles, width, height, x, height - 1, { char: 205, color: 15 })
  }
  writeTile(tiles, width, height, 1, 0, { char: 205, color: 15 })
  writeTile(tiles, width, height, 2, 0, { char: 187, color: 15 })
  writeTile(tiles, width, height, 1, 1, { char: 232, color: 15 })
  writeTile(tiles, width, height, 2, 1, { char: 200, color: 15 })

  for (let y = 1; y < height - 1; ++y) {
    writeTile(tiles, width, height, 0, y, { char: 179, color: 15 })
    writeTile(tiles, width, height, width - 1, y, { char: 179, color: 15 })
  }

  for (let y = 2; y < height - 1; ++y) {
    writeTile(tiles, width, height, 1, y, { char: 0, color: 15 })
    writeTile(tiles, width, height, width - 2, y, { char: 0, color: 15 })
  }

  // corners
  // top left-right
  writeTile(tiles, width, height, 0, 0, { char: 213, color: 15 })
  writeTile(tiles, width, height, width - 1, 0, { char: 191, color: 15 })
  writeTile(tiles, width, height, width - 1, 1, { char: 181, color: 15 })
  // bottom left-right
  writeTile(tiles, width, height, 0, height - 1, { char: 212, color: 15 })
  writeTile(tiles, width, height, width - 1, height - 1, {
    char: 190,
    color: 15,
  })

  // measure title
  const title = ` ${name} `
  const measure = tokenizeandmeasuretextformat(title, width, height)

  // center title
  const titleWidth = measure?.x ?? title.length
  const context = {
    ...createwritetextcontext(width, height, color, bg, 0, 0, width, height),
    ...tiles,
    x: Math.round(width * 0.5) - Math.round(titleWidth * 0.5),
  }

  tokenizeandwritetextformat(title, context, true)

  // input cursor
  const [cursor, setCursor] = useState(0)

  // display offset
  let offset = cursor - Math.floor(panelheight * 0.5)
  offset = Math.min(text.length - panelheight, offset)
  offset = Math.max(0, offset)

  const visibletext = text.slice(offset, offset + panelheight)

  // display cursor
  const row = cursor - offset
  writeTile(tiles, width, height, 1, 2 + row, { char: 26, color: 12 })

  const wither = [0.001, 0.05, 0.1, 0.2]
  const WITHER_CENTER = 0.4
  resetDither(dither)
  for (let x = 0; x < panelwidth; ++x) {
    writeDither(dither, panelwidth, panelheight, x, row, WITHER_CENTER)
    for (let i = 0; i < wither.length; ++i) {
      const edge = wither.length - i
      writeDither(dither, panelwidth, panelheight, x, row - edge, wither[i])
      writeDither(dither, panelwidth, panelheight, x, row + edge, wither[i])
    }
  }

  const groupref = useRef<Group>(null)

  const didstop = useCallback(() => {
    if (shouldclose) {
      scroll.didclose()
    }
  }, [shouldclose, scroll])

  // start position
  useEffect(() => {
    if (groupref.current && !shouldclose) {
      const start = viewport.height
      groupref.current.position.y = start
      groupref.current.userData.y = start
      groupref.current.userData.vy = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldclose])

  // slick move
  useFrame(
    useCallback(
      (_, delta) => {
        if (ispresent(groupref.current)) {
          const target = shouldclose ? height * 2 * -DRAW_CHAR_HEIGHT : 0
          if (animpositiontotarget(groupref.current, 'y', target, delta)) {
            // signal completion
            didstop()
          }
        }
      },
      [shouldclose, didstop, height],
    ),
  )

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setCursor((state) => Math.max(0, state - step))
    },
    [setCursor],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setCursor((state) => Math.min(text.length, state + step))
    },
    [setCursor, text.length],
  )

  return (
    <group ref={groupref} position-y={1000000}>
      <UserFocus>
        <UserInput
          MOVE_UP={up}
          MOVE_DOWN={down}
          CANCEL_BUTTON={scroll.sendclose}
        />
        <TileSnapshot tiles={tiles} width={width} height={height} />
        <group
          // eslint-disable-next-line react/no-unknown-property
          position={[2 * DRAW_CHAR_WIDTH, 2 * DRAW_CHAR_HEIGHT, 0]}
        >
          <DitherSnapshot
            dither={dither}
            width={panelwidth}
            height={panelheight}
          />
          <Panel
            player={player}
            name={name}
            width={panelwidth}
            height={panelheight}
            margin={0}
            color={color}
            bg={COLOR.CLEAR}
            text={visibletext}
            selected={row}
          />
        </group>
      </UserFocus>
    </group>
  )
}
