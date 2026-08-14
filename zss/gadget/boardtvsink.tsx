import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { VideoTexture } from 'three'
import { RUNTIME } from 'zss/config'
import { mediaqueueensurevideosink } from 'zss/feature/mediaqueue/attachvideo'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/receive'
import { updateTexture } from 'zss/gadget/display/textures'
import { useMedia } from 'zss/gadget/media'

/** Flat graphics: landscape board TV in char cells. */
const FLAT_TV_COLS = 40
const FLAT_TV_ROWS = 15

/** Mode7 / iso / fpv: upright (portrait) board TV in char cells. */
const VERTICAL_TV_COLS = 15
const VERTICAL_TV_ROWS = 40

type BoardTvSinkProps = {
  width: number
  height: number
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
 * Board-region MediaStream sink (media queue). Not a tape overlay -- does not
 * steal UserFocus so play continues while video is up.
 *
 * Flat: centered 40x15. Other graphics: centered vertical 15x40.
 */
export function BoardTvSink({ width, height, graphics }: BoardTvSinkProps) {
  useEffect(() => {
    mediaqueuebootstrap()
    mediaqueueensurevideosink()
  }, [])

  const screen = useMedia((state) => state.screen)
  const video =
    Object.values(screen).find((entry) => entry instanceof HTMLVideoElement) ??
    null

  if (!video || width < 4 || height < 4) {
    return null
  }

  const isflat = graphics === 'flat'
  const tvcols = isflat ? FLAT_TV_COLS : VERTICAL_TV_COLS
  const tvrows = isflat ? FLAT_TV_ROWS : VERTICAL_TV_ROWS
  const drawwidth = Math.max(1, tvcols * RUNTIME.DRAW_CHAR_WIDTH())
  const drawheight = Math.max(1, tvrows * RUNTIME.DRAW_CHAR_HEIGHT())
  const centerx = width * RUNTIME.DRAW_CHAR_WIDTH() * 0.5
  const centery = height * RUNTIME.DRAW_CHAR_HEIGHT() * 0.5

  return (
    <group position={[0, 0, 400]}>
      <group
        position={[centerx, centery, 1]}
        scale-x={-1}
        rotation-z={Math.PI}
      >
        <BoardTvPlane
          video={video}
          drawwidth={drawwidth}
          drawheight={drawheight}
        />
      </group>
    </group>
  )
}
