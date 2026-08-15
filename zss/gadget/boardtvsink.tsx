import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Euler, VideoTexture } from 'three'
import { RUNTIME } from 'zss/config'
import { mediaqueueensurevideosink } from 'zss/feature/mediaqueue/attachvideo'
import {
  boardtvshouldshow,
  mediaqueuehasvideo,
} from 'zss/feature/mediaqueue/boardtvvisible'
import {
  BOARD_TV_COLS,
  BOARD_TV_ROWS,
  boardtvisupright,
} from 'zss/feature/mediaqueue/constants'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/receive'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { updateTexture } from 'zss/gadget/display/textures'
import { useMedia } from 'zss/gadget/media'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

type BoardTvSinkProps = {
  graphics: string
}

function BoardTvPlane({
  video,
  drawwidth,
  drawheight,
}: {
  video: HTMLVideoElement
  drawwidth: number
  drawheight: number
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
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

/**
 * Board-space MediaStream sink (#media). Parent must be the live board group
 * so the TV pans/tilts with the board. Not a tape overlay.
 */
export function BoardTvSink({ graphics }: BoardTvSinkProps) {
  const gadgetboard = useGadgetClient((state) => state.gadget.board ?? '')

  useEffect(() => {
    mediaqueuebootstrap()
    mediaqueueensurevideosink()
  }, [])

  const screen = useMedia((state) => state.screen)
  const video =
    Object.values(screen).find((entry) => entry instanceof HTMLVideoElement) ??
    null

  if (!video || !boardtvshouldshow(gadgetboard, mediaqueuehasvideo(screen))) {
    return null
  }

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const tvdrawwidth = BOARD_TV_COLS * drawwidth
  const tvdrawheight = BOARD_TV_ROWS * drawheight
  const centerx = BOARD_WIDTH * drawwidth * 0.5
  const centery = BOARD_HEIGHT * drawheight * 0.5

  // FPV looks horizontally so the TV stands on the board. Flat / iso / mode7
  // look down at XY -- the same upright pose reads as a thin top edge.
  const rotation = boardtvisupright(graphics)
    ? new Euler(-Math.PI * 0.5, 0, Math.PI)
    : new Euler(0, 0, Math.PI)
  const z = graphics === 'flat' ? 800 : drawheight * 0.5

  return (
    <group position={[centerx, centery, z]} rotation={rotation} scale-x={-1}>
      <BoardTvPlane
        video={video}
        drawwidth={tvdrawwidth}
        drawheight={tvdrawheight}
      />
    </group>
  )
}
