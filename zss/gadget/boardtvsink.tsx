import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { DoubleSide, Euler, VideoTexture } from 'three'
import { RUNTIME } from 'zss/config'
import { mediaqueueensurevideosink } from 'zss/feature/mediaqueue/attachvideo'
import { useBoardTvVisible } from 'zss/feature/mediaqueue/boardtvvisible'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/bootstrap'
import {
  type BOARD_TV_LAYOUT,
  BOARD_TV_ROWS,
  boardtvisupright,
  boardtvlayerz,
  boardtvlayout,
} from 'zss/feature/mediaqueue/constants'
import { boardtvvideofit, boardtvvideorect } from 'zss/gadget/boardtvgrid'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { updateTexture } from 'zss/gadget/display/textures'
import { useMedia } from 'zss/gadget/media'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

/** Upright modes rotate the board plane onto the world XZ wall plane. */
const BOARD_TV_UPRIGHT_ROTATION = new Euler(-Math.PI * 0.5, 0, 0)
const BOARD_TV_FLAT_ROTATION = new Euler(0, 0, 0)

type BoardTvSinkProps = {
  graphics: string
}

type BOARD_TV_VIDEO_FIT = {
  width: number
  height: number
  centerx: number
  centery: number
}

function BoardTvPlane({
  texture,
  fit,
  z,
  flipvertical,
}: {
  texture: VideoTexture
  fit: BOARD_TV_VIDEO_FIT
  z: number
  flipvertical: boolean
}) {
  return (
    <group
      position={[fit.centerx, fit.centery, z]}
      scale-y={flipvertical ? -1 : 1}
    >
      <mesh scale={[fit.width, fit.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * One viewable side of the TV: video plane only (helper compositor owns HUD).
 * `spin` turns the side about the scene up axis; `depth` pushes along its
 * normal so two sides form a slab.
 */
function BoardTvFace({
  texture,
  fit,
  layout,
  upright,
  spin,
  depth,
  tvdrawheight,
}: {
  texture: VideoTexture
  fit: BOARD_TV_VIDEO_FIT
  layout: BOARD_TV_LAYOUT
  upright: boolean
  spin: number
  depth: number
  tvdrawheight: number
}) {
  // Upright rotation maps local +Y to world -Z, so lift by -half to stand on the floor.
  const lifty = upright ? -tvdrawheight * 0.5 : 0
  return (
    <group rotation-z={spin}>
      <group
        rotation={upright ? BOARD_TV_UPRIGHT_ROTATION : BOARD_TV_FLAT_ROTATION}
      >
        <group position={[0, lifty, depth]}>
          <BoardTvPlane
            texture={texture}
            fit={fit}
            z={layout.videoz}
            flipvertical={layout.videoflipvertical}
          />
        </group>
      </group>
    </group>
  )
}

/**
 * Board-space MediaStream sink (#media). Must live inside liveboard so
 * syncliveboardworldoffset keeps it on the current board grid slot.
 * Slide intro is off while the invisible-TV bug is open.
 */
export function BoardTvSink({ graphics }: BoardTvSinkProps) {
  const gadgetboard = useGadgetClient((state) => state.gadget.board ?? '')

  useEffect(() => {
    mediaqueuebootstrap()
    mediaqueueensurevideosink()
  }, [])

  const screen = useMedia((state) => state.screen)
  const wantshow = useBoardTvVisible(gadgetboard)
  const video =
    Object.values(screen).find((entry) => entry instanceof HTMLVideoElement) ??
    null

  const [videosize, setvideosize] = useState({
    w: video?.videoWidth ?? 0,
    h: video?.videoHeight ?? 0,
  })

  useEffect(() => {
    if (!video) {
      setvideosize({ w: 0, h: 0 })
      return
    }
    const syncsize = () => {
      setvideosize({
        w: video.videoWidth || 0,
        h: video.videoHeight || 0,
      })
    }
    syncsize()
    video.addEventListener('loadedmetadata', syncsize)
    video.addEventListener('loadeddata', syncsize)
    video.addEventListener('playing', syncsize)
    video.addEventListener('resize', syncsize)
    return () => {
      video.removeEventListener('loadedmetadata', syncsize)
      video.removeEventListener('loadeddata', syncsize)
      video.removeEventListener('playing', syncsize)
      video.removeEventListener('resize', syncsize)
    }
  }, [video])

  // Create only after frames exist. A VideoTexture built at videoWidth 0 stays
  // dead in Chrome (dimensions locked after first GPU upload).
  const texturegen = videosize.w > 0 && videosize.h > 0 ? 1 : 0
  const videotexture = useMemo(
    () =>
      video && texturegen > 0
        ? updateTexture(new VideoTexture(video))
        : null,
    [video, texturegen],
  )
  useEffect(() => {
    return () => {
      videotexture?.dispose()
    }
  }, [videotexture])

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const tvdrawheight = BOARD_TV_ROWS * drawheight
  const upright = boardtvisupright(graphics)
  const layout = boardtvlayout(graphics, drawheight)
  const videorect = boardtvvideorect(drawwidth, drawheight, tvdrawheight)

  useFrame(() => {
    const w = video?.videoWidth ?? 0
    const h = video?.videoHeight ?? 0
    if (w !== videosize.w || h !== videosize.h) {
      setvideosize({ w, h })
    }
    if (!wantshow || !videotexture) {
      return
    }
    videotexture.needsUpdate = true
  })

  if (!wantshow || !videotexture) {
    return null
  }

  const centerx = BOARD_WIDTH * drawwidth * 0.5
  const centery = BOARD_HEIGHT * drawheight * 0.5
  const z = boardtvlayerz(graphics, drawheight)
  const fit = boardtvvideofit(videosize.w, videosize.h, videorect)
  const depth = layout.backface ? layout.videoz : 0

  return (
    <group position={[centerx, centery, z]}>
      <BoardTvFace
        texture={videotexture}
        fit={fit}
        layout={layout}
        upright={upright}
        spin={0}
        depth={depth}
        tvdrawheight={tvdrawheight}
      />
      {layout.backface ? (
        <BoardTvFace
          texture={videotexture}
          fit={fit}
          layout={layout}
          upright={upright}
          spin={Math.PI}
          depth={depth}
          tvdrawheight={tvdrawheight}
        />
      ) : null}
    </group>
  )
}
