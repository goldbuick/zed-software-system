import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Euler, VideoTexture } from 'three'
import { RUNTIME } from 'zss/config'
import { mediaqueueensurevideosink } from 'zss/feature/mediaqueue/attachvideo'
import {
  mediaqueuehasvideo,
  useBoardTvVisible,
} from 'zss/feature/mediaqueue/boardtvvisible'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/bootstrap'
import {
  BOARD_TV_COLS,
  BOARD_TV_CRT_VIDEO_CEILING,
  BOARD_TV_CRT_VIDEO_SATURATION,
  BOARD_TV_FLAT_VIDEO_CEILING,
  BOARD_TV_FLAT_VIDEO_SATURATION,
  type BOARD_TV_LAYOUT,
  BOARD_TV_ROWS,
  boardtvisupright,
  boardtvlayerz,
  boardtvlayout,
} from 'zss/feature/mediaqueue/constants'
import {
  boardtvvideofit,
  boardtvvideorect,
  drawboardtvmarqueerow,
  initboardtvgrid,
} from 'zss/gadget/boardtvgrid'
import { BoardTvSlide } from 'zss/gadget/boardtvslide'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { useDeviceData } from 'zss/gadget/device'
import { createboardtvvideomaterial } from 'zss/gadget/display/boardtvvideo'
import { updateTexture } from 'zss/gadget/display/textures'
import { useMedia } from 'zss/gadget/media'
import { type TILE_DATA, useTiles } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { isstring } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { SCROLL_SPEED } from 'zss/screens/scroll/marqueebuffer'
import type { StoreApi } from 'zustand'

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
  const crtactive = useDeviceData((state) => state.crtactive)
  const material = useMemo(() => createboardtvvideomaterial(), [])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => {
    material.uniforms.map.value = texture
  }, [material, texture])
  useEffect(() => {
    material.uniforms.ceiling.value = crtactive
      ? BOARD_TV_CRT_VIDEO_CEILING
      : BOARD_TV_FLAT_VIDEO_CEILING
    material.uniforms.saturation.value = crtactive
      ? BOARD_TV_CRT_VIDEO_SATURATION
      : BOARD_TV_FLAT_VIDEO_SATURATION
  }, [material, crtactive])
  return (
    <group
      position={[fit.centerx, fit.centery, z]}
      scale-y={flipvertical ? -1 : 1}
    >
      <mesh scale={[fit.width, fit.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  )
}

/**
 * One viewable side of the TV: chrome tiles plus the video plane, built facing
 * local +Z. `spin` turns the whole side about the scene up axis, and `depth`
 * pushes it out along its own normal so the two sides form a slab.
 */
function BoardTvFace({
  gridstore,
  texture,
  fit,
  layout,
  upright,
  spin,
  depth,
  tvdrawwidth,
  tvdrawheight,
}: {
  gridstore: StoreApi<TILE_DATA>
  texture: VideoTexture | null
  fit: BOARD_TV_VIDEO_FIT
  layout: BOARD_TV_LAYOUT
  upright: boolean
  spin: number
  depth: number
  tvdrawwidth: number
  tvdrawheight: number
}) {
  // Upright rotation maps tile +Y to world -Z, so lift by -half to stand on the floor.
  const lifty = upright ? -tvdrawheight * 0.5 : 0
  return (
    <group rotation-z={spin}>
      <group
        rotation={upright ? BOARD_TV_UPRIGHT_ROTATION : BOARD_TV_FLAT_ROTATION}
      >
        <group position={[0, lifty, depth]}>
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
 * live board. Slide-in on mount; hide is instant unmount. Not a tape overlay.
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
  const wantshow = useBoardTvVisible(gadgetboard, hasvideo)
  const video =
    Object.values(screen).find((entry) => entry instanceof HTMLVideoElement) ??
    null

  const gridstore = useTiles(BOARD_TV_COLS, BOARD_TV_ROWS, 0, 0, 0)
  const [videosize, setvideosize] = useState({ w: 0, h: 0 })
  const marqueeacc = useRef(0)
  const marqueeoffset = useRef(0)
  const lastmarqueedraw = useRef('')

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
    if (!wantshow) {
      return
    }
    const grid = initboardtvgrid()
    const state = gridstore.getState()
    for (let i = 0; i < grid.char.length; ++i) {
      state.char[i] = grid.char[i]
      state.color[i] = grid.color[i]
      state.bg[i] = grid.bg[i]
    }
    state.changed()
    marqueeoffset.current = 0
    marqueeacc.current = 0
    lastmarqueedraw.current = ''
    drawboardtvmarqueerow(
      gridstore.getState(),
      layout.marqueerow,
      nowplayinglabel,
      0,
    )
  }, [gridstore, nowplayinglabel, layout.marqueerow, wantshow])

  useFrame((_, delta) => {
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
          gridstore={gridstore}
          texture={videotexture}
          fit={fit}
          layout={layout}
          upright={upright}
          spin={0}
          depth={depth}
          tvdrawwidth={tvdrawwidth}
          tvdrawheight={tvdrawheight}
        />
        {layout.backface ? (
          <BoardTvFace
            gridstore={gridstore}
            texture={videotexture}
            fit={fit}
            layout={layout}
            upright={upright}
            spin={Math.PI}
            depth={depth}
            tvdrawwidth={tvdrawwidth}
            tvdrawheight={tvdrawheight}
          />
        ) : null}
      </BoardTvSlide>
    </group>
  )
}
