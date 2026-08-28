import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { DoubleSide, Euler, VideoTexture } from 'three'
import { RUNTIME } from 'zss/config'
import { mediaqueueensurevideosink } from 'zss/feature/mediaqueue/attachvideo'
import {
  mediaqueuehasvideo,
  useBoardTvVisible,
} from 'zss/feature/mediaqueue/boardtvvisible'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/bootstrap'
import {
  type BOARD_TV_LAYOUT,
  BOARD_TV_ROWS,
  boardtvisupright,
  boardtvlayerz,
  boardtvlayout,
} from 'zss/feature/mediaqueue/constants'
import { boardtvvideofit, boardtvvideorect } from 'zss/gadget/boardtvgrid'
import { BoardTvSlide } from 'zss/gadget/boardtvslide'
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
        <meshBasicMaterial map={texture} side={DoubleSide} />
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
  texture: VideoTexture | null
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
          {texture ? (
            <BoardTvPlane
              texture={texture}
              fit={fit}
              z={layout.videoz}
              flipvertical={layout.videoflipvertical}
            />
          ) : null}
        </group>
      </group>
    </group>
  )
}

/**
 * Board-space MediaStream sink (#media). Parent should be the focus/corner
 * frame (sibling of liveboard), not liveboard itself -- edge-pan offsets the
 * live board. Slide-in on mount; hide is instant unmount. Visuals come from
 * the helper compositor stream (no cafe tile chrome).
 */
export function BoardTvSink({ graphics }: BoardTvSinkProps) {
  const gadgetboard = useGadgetClient((state) => state.gadget.board ?? '')

  useEffect(() => {
    mediaqueuebootstrap()
    mediaqueueensurevideosink()
  }, [])

  const screen = useMedia((state) => state.screen)
  const hasvideo = mediaqueuehasvideo(screen)
  const wantshow = useBoardTvVisible(gadgetboard, hasvideo)
  const video =
    Object.values(screen).find((entry) => entry instanceof HTMLVideoElement) ??
    null

  const [videosize, setvideosize] = useState({ w: 0, h: 0 })

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
    video.addEventListener('resize', syncsize)
    return () => {
      video.removeEventListener('loadedmetadata', syncsize)
      video.removeEventListener('resize', syncsize)
    }
  }, [video])

  // One texture shared by both faces; a second VideoTexture would upload the
  // same frame twice each tick.
  const videotexture = useMemo(
    () => (video ? updateTexture(new VideoTexture(video)) : null),
    [video],
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
    if (!wantshow) {
      return
    }
    if (videotexture) {
      videotexture.needsUpdate = true
    }
    const w = video?.videoWidth ?? 0
    const h = video?.videoHeight ?? 0
    if (w !== videosize.w || h !== videosize.h) {
      setvideosize({ w, h })
    }
  })

  if (!wantshow) {
    return null
  }

  const centerx = BOARD_WIDTH * drawwidth * 0.5
  const centery = BOARD_HEIGHT * drawheight * 0.5
  const z = boardtvlayerz(graphics, drawheight)
  const fit = boardtvvideofit(videosize.w, videosize.h, videorect)
  // Each face pushes out along its own normal, so the pair reads as a slab
  // instead of two coplanar surfaces fighting for depth.
  const depth = layout.backface ? layout.videoz : 0
  // Rise from below the mount (negative local Y).
  const edgeoff = -tvdrawheight

  return (
    <group position={[centerx, centery, z]}>
      <BoardTvSlide edgeoff={edgeoff}>
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
      </BoardTvSlide>
    </group>
  )
}
