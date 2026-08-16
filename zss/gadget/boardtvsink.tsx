import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
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
  boardtvinnerpixels,
  boardtvisupright,
  boardtvlayerz,
} from 'zss/feature/mediaqueue/constants'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/bootstrap'
import { BoardTvMarquee } from 'zss/gadget/boardtvmarquee'
import { type BOX_FRAME, buildboxframe } from 'zss/gadget/boxframe'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { updateTexture } from 'zss/gadget/display/textures'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'
import { Tiles } from 'zss/gadget/graphics/tiles'
import { useMedia } from 'zss/gadget/media'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { isstring } from 'zss/mapping/types'
import { COLOR } from 'zss/words/types'

type BoardTvSinkProps = {
  graphics: string
}

function boardtvzstep(drawheight: number): number {
  return Math.max(0.5, drawheight * 0.02)
}

function buildboardtvframe(): BOX_FRAME {
  const frame = buildboxframe(BOARD_TV_COLS, BOARD_TV_ROWS, COLOR.PURPLE)
  for (let y = 0; y < BOARD_TV_ROWS; ++y) {
    for (let x = 0; x < BOARD_TV_COLS; ++x) {
      const isinterior =
        x > 0 && x < BOARD_TV_COLS - 1 && y > 0 && y < BOARD_TV_ROWS - 1
      if (isinterior) {
        continue
      }
      const i = x + y * BOARD_TV_COLS
      frame.bg[i] = COLOR.BLACK
    }
  }
  return frame
}

function BoardTvPlane({
  video,
  drawwidth,
  drawheight,
  z,
  userenderorder,
}: {
  video: HTMLVideoElement
  drawwidth: number
  drawheight: number
  z: number
  userenderorder: boolean
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
  const scale = Math.min(drawwidth / vw, drawheight / vh)
  const w = vw * scale
  const h = vh * scale

  return (
    <mesh position={[0, 0, z]} {...(userenderorder ? { renderOrder: 2 } : {})}>
      <planeGeometry args={[w, h]} />
      {/* toneMapped: video texture should not pass through renderer tone mapping */}
      {/* eslint-disable-next-line react/no-unknown-property -- three.js Material.toneMapped via R3F */}
      <meshBasicMaterial map={texture} toneMapped={false} side={DoubleSide} />
    </mesh>
  )
}

function BoardTvBlackFill({
  width,
  height,
  z,
  userenderorder,
}: {
  width: number
  height: number
  z: number
  userenderorder: boolean
}) {
  return (
    <mesh position={[0, 0, z]} {...(userenderorder ? { renderOrder: 1 } : {})}>
      <planeGeometry args={[width, height]} />
      {/* eslint-disable-next-line react/no-unknown-property -- three.js Material.toneMapped via R3F */}
      <meshBasicMaterial color="#000000" toneMapped={false} side={DoubleSide} />
    </mesh>
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

  const frame = useMemo(() => buildboardtvframe(), [])

  if (!shouldshow) {
    return null
  }

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const tvdrawwidth = BOARD_TV_COLS * drawwidth
  const tvdrawheight = BOARD_TV_ROWS * drawheight
  const inner = boardtvinnerpixels(drawwidth, drawheight)
  const centerx = BOARD_WIDTH * drawwidth * 0.5
  const centery = BOARD_HEIGHT * drawheight * 0.5

  // FPV / iso stand the TV on the board edge; flat / mode7 lay it in the XY plane.
  const rotation = boardtvisupright(graphics)
    ? new Euler(-Math.PI * 0.5, 0, Math.PI)
    : new Euler(0, 0, Math.PI)
  const upright = boardtvisupright(graphics)
  const z = boardtvlayerz(graphics, drawheight)
  const lifty = upright ? tvdrawheight * 0.5 : 0
  const zstep = boardtvzstep(drawheight)
  const flatstack = normalizelayerzvariant(graphics) === 'flat'
  // Flat: group z=2 sits between tiles (1) and sprites (3+); inner offsets would overshoot sprites.
  const innerblackz = flatstack ? 0 : zstep
  const innervideoz = flatstack ? 0.001 : zstep * 2
  const marqueez = flatstack ? 0.002 : zstep * 3
  // Flat stacks TV at z=2 and sprites at z=3+; renderOrder would paint over sprites.
  const userenderorder = !flatstack

  return (
    <group position={[centerx, centery, z]} rotation={rotation} scale-x={-1}>
      <group position={[0, lifty, 0]}>
        <group position={[-tvdrawwidth * 0.5, -tvdrawheight * 0.5, 0]}>
          <Tiles
            width={BOARD_TV_COLS}
            height={BOARD_TV_ROWS}
            char={frame.char}
            color={frame.color}
            bg={frame.bg}
            skipraycast
            mediasource="board"
          />
        </group>
        <BoardTvBlackFill
          width={inner.width}
          height={inner.height}
          z={innerblackz}
          userenderorder={userenderorder}
        />
        {video ? (
          <BoardTvPlane
            video={video}
            drawwidth={inner.width}
            drawheight={inner.height}
            z={innervideoz}
            userenderorder={userenderorder}
          />
        ) : null}
        <BoardTvMarquee
          label={nowplayinglabel}
          drawwidth={drawwidth}
          drawheight={drawheight}
          tvdrawwidth={tvdrawwidth}
          tvdrawheight={tvdrawheight}
          z={marqueez}
        />
      </group>
    </group>
  )
}
