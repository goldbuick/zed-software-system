import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { VideoTexture } from 'three'
import { RUNTIME } from 'zss/config'
import { mediaqueueensurevideosink } from 'zss/feature/mediaqueue/attachvideo'
import { updateTexture } from 'zss/gadget/display/textures'
import { useMedia } from 'zss/gadget/media'

type BoardTvSinkProps = {
  width: number
  height: number
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
 */
export function BoardTvSink({ width, height }: BoardTvSinkProps) {
  useEffect(() => {
    mediaqueueensurevideosink()
  }, [])

  const screen = useMedia((state) => state.screen)
  const video =
    Object.values(screen).find((entry) => entry instanceof HTMLVideoElement) ??
    null

  if (!video || width < 4 || height < 4) {
    return null
  }

  const drawwidth = Math.max(1, (width - 2) * RUNTIME.DRAW_CHAR_WIDTH())
  const drawheight = Math.max(1, (height - 2) * RUNTIME.DRAW_CHAR_HEIGHT())
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
