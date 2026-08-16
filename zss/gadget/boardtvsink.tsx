import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide, Euler, VideoTexture } from 'three'
import { RUNTIME } from 'zss/config'
import { mediaqueueensurevideosink } from 'zss/feature/mediaqueue/attachvideo'
import {
  mediaqueuehasvideo,
  useBoardTvVisible,
} from 'zss/feature/mediaqueue/boardtvvisible'
import {
  BOARD_TV_COLS,
  BOARD_TV_ROWS,
  boardtvlayout,
  boardtvisupright,
  boardtvlayerz,
} from 'zss/feature/mediaqueue/constants'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/bootstrap'
import {
  boardtvvideorect,
  drawboardtvmarqueerow,
  initboardtvgrid,
} from 'zss/gadget/boardtvgrid'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { updateTexture } from 'zss/gadget/display/textures'
import { useTiles } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { useMedia } from 'zss/gadget/media'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { isstring } from 'zss/mapping/types'
import { SCROLL_SPEED } from 'zss/screens/scroll/marqueebuffer'

/** Upright modes rotate the board plane onto the world XZ wall plane. */
const BOARD_TV_UPRIGHT_ROTATION = new Euler(-Math.PI * 0.5, 0, 0)
const BOARD_TV_FLAT_ROTATION = new Euler(0, 0, 0)

type BoardTvSinkProps = {
  graphics: string
}

function BoardTvPlane({
  video,
  width,
  height,
  centerx,
  centery,
  z,
  flipvertical,
}: {
  video: HTMLVideoElement
  width: number
  height: number
  centerx: number
  centery: number
  z: number
  flipvertical: boolean
}) {
  const texture = useMemo(() => {
    const tex = new VideoTexture(video)
    return updateTexture(tex)
  }, [video])

  useFrame(() => {
    texture.needsUpdate = true
  })

  const vw = Math.max(1, video.videoWidth || 640)
  const vh = Math.max(1, video.videoHeight || 480)
  const scale = Math.min(width / vw, height / vh)
  const w = vw * scale
  const h = vh * scale

  return (
    <group
      position={[centerx, centery, z]}
      scale-y={flipvertical ? -1 : 1}
    >
      <mesh>
        <planeGeometry args={[w, h]} />
        {/* toneMapped: video texture should not pass through renderer tone mapping */}
        {/* eslint-disable-next-line react/no-unknown-property -- three.js Material.toneMapped via R3F */}
        <meshBasicMaterial map={texture} toneMapped={false} side={DoubleSide} />
      </mesh>
    </group>
  )
}

/**
 * Board-space MediaStream sink (#media). Parent must be the live board group
 * so the TV pans/tilts with the board. Not a tape overlay.
 */
export function BoardTvSink({ graphics }: BoardTvSinkProps) {
  const gadgetboard = useGadgetClient((state) => state.gadget.board ?? '')
  const nowplayinglabel = useGadgetClient((state) => {
    const layers = state.gadget.layers ?? []
    for (let i = 0; i < layers.length; ++i) {
      const layer = layers[i]
      if (
        layer.type === LAYER_TYPE.MEDIA &&
        layer.mime === 'text/mediaqueue-nowplaying' &&
        isstring(layer.media)
      ) {
        return layer.media.trim()
      }
    }
    return ''
  })

  useEffect(() => {
    mediaqueuebootstrap()
    mediaqueueensurevideosink()
  }, [])

  const screen = useMedia((state) => state.screen)
  const hasvideo = mediaqueuehasvideo(screen)
  const shouldshow = useBoardTvVisible(gadgetboard, hasvideo)
  const video =
    Object.values(screen).find((entry) => entry instanceof HTMLVideoElement) ??
    null

  const gridstore = useTiles(BOARD_TV_COLS, BOARD_TV_ROWS, 0, 0, 0)
  const marqueeacc = useRef(0)
  const marqueeoffset = useRef(0)
  const lastmarqueedraw = useRef('')

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const tvdrawwidth = BOARD_TV_COLS * drawwidth
  const tvdrawheight = BOARD_TV_ROWS * drawheight
  const upright = boardtvisupright(graphics)
  const layout = boardtvlayout(graphics, drawheight)
  const videorect = boardtvvideorect(
    layout.marqueerow,
    drawwidth,
    drawheight,
    tvdrawheight,
  )

  useEffect(() => {
    const grid = initboardtvgrid()
    const state = gridstore.getState()
    for (let i = 0; i < grid.char.length; ++i) {
      state.char[i] = grid.char[i]
      state.color[i] = grid.color[i]
      state.bg[i] = grid.bg[i]
    }
    state.changed()
  }, [gridstore])

  useEffect(() => {
    marqueeoffset.current = 0
    marqueeacc.current = 0
    lastmarqueedraw.current = ''
    drawboardtvmarqueerow(
      gridstore.getState(),
      layout.marqueerow,
      nowplayinglabel,
      0,
    )
  }, [gridstore, nowplayinglabel, layout.marqueerow])

  useFrame((_, delta) => {
    const trimmed = nowplayinglabel.trim()
    if (!trimmed) {
      return
    }
    marqueeacc.current += delta
    if (marqueeacc.current < SCROLL_SPEED) {
      return
    }
    marqueeacc.current %= SCROLL_SPEED
    marqueeoffset.current += layout.scrollstep
    const drawkey = `${marqueeoffset.current}|${trimmed}`
    if (drawkey === lastmarqueedraw.current) {
      return
    }
    lastmarqueedraw.current = drawkey
    drawboardtvmarqueerow(
      gridstore.getState(),
      layout.marqueerow,
      trimmed,
      marqueeoffset.current,
    )
  })

  if (!shouldshow) {
    return null
  }

  const centerx = BOARD_WIDTH * drawwidth * 0.5
  const centery = BOARD_HEIGHT * drawheight * 0.5
  const z = boardtvlayerz(graphics, drawheight)
  // Upright rotation maps tile +Y to world -Z, so lift by -half to stand on the floor.
  const lifty = upright ? -tvdrawheight * 0.5 : 0

  return (
    <group
      position={[centerx, centery, z]}
      rotation={upright ? BOARD_TV_UPRIGHT_ROTATION : BOARD_TV_FLAT_ROTATION}
    >
      <group position={[0, lifty, 0]}>
        <group position={[-tvdrawwidth * 0.5, -tvdrawheight * 0.5, 0]}>
          <TilesData store={gridstore}>
            <TilesRender
              label="board-tv-chrome"
              width={BOARD_TV_COLS}
              height={BOARD_TV_ROWS}
              skipraycast
              mediasource="board"
            />
          </TilesData>
        </group>
        {video ? (
          <BoardTvPlane
            video={video}
            width={videorect.width}
            height={videorect.height}
            centerx={videorect.centerx}
            centery={videorect.centery}
            z={layout.videoz}
            flipvertical={layout.videoflipvertical}
          />
        ) : null}
      </group>
    </group>
  )
}
