import { useFrame } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp, damp3, dampE } from 'maath/easing'
import { DepthOfFieldEffect } from 'postprocessing'
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'
import {
  Group,
  PerspectiveCamera as PerspectiveCameraImpl,
  Vector3,
} from 'three'
import { RUNTIME } from 'zss/config'
import { BoardTvSink } from 'zss/gadget/boardtvsink'
import { LAYER_TYPE, VIEWSCALE, readgadgetcontrol } from 'zss/gadget/data/types'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { useDeviceData } from 'zss/gadget/device'
import { DepthFog } from 'zss/gadget/fx/depthfog'
import { boardinspectorzfromgadgetstacks } from 'zss/gadget/graphics/boardinspectorz'
import {
  initfocusifneeded,
  isfocuspanphase,
  readgridbias,
  stashfocusexitsnap,
  stepfocuswithboardtransition,
} from 'zss/gadget/graphics/camerafocus'
import {
  buildexitpreviewgroups,
  gadgettoexitsnap,
} from 'zss/gadget/graphics/exitpreviewgroups'
import { FlatLayer } from 'zss/gadget/graphics/flatlayer'
import { FPVLayer } from 'zss/gadget/graphics/fpvlayer'
import { maptolayerz, maxspriteslayerz } from 'zss/gadget/graphics/layerz'
import {
  PANVIEW_IDLE,
  type PanView,
  panviewequals,
  readboardgridforrender,
  resolvepanviewforrender,
  setdofplayerworld,
  syncliveboardworldoffset,
} from 'zss/gadget/graphics/panviewsync'
import { PillarwMeshes } from 'zss/gadget/graphics/pillarmeshes'
import { RenderLayer } from 'zss/gadget/graphics/renderlayer'
import { tickerpublishfromtickers } from 'zss/gadget/graphics/tickeranchors'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { InspectorComponent } from 'zss/screens/inspector/component'
import { COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

type GraphicsProps = {
  width: number
  height: number
}

function maptofov(viewscale: VIEWSCALE): number {
  switch (viewscale) {
    case VIEWSCALE.NEAR:
      return 25
    default:
    case VIEWSCALE.MID:
      return 75
    case VIEWSCALE.FAR:
      return 110
  }
}

const FOV_MATRIX_EPS = 1e-3
const CARDINAL_PREVIEW_KEYS = new Set([
  'e',
  'w',
  'n',
  's',
  'de',
  'dw',
  'dn',
  'ds',
  'e2',
  'w2',
  'n2',
  's2',
])

// board edge meshes
const edgechars: number[] = []
const edgecolors: number[] = []
const edgebgs: number[] = []
for (let y = 0; y < BOARD_HEIGHT; ++y) {
  for (let x = 0; x < BOARD_WIDTH; ++x) {
    if (x === 0 || x === BOARD_WIDTH - 1 || y === 0 || y === BOARD_HEIGHT - 1) {
      edgechars.push(32)
      edgecolors.push(COLOR.BLACK)
      edgebgs.push(COLOR.BLACK)
    } else {
      edgechars.push(0)
      edgecolors.push(0)
      edgebgs.push(COLOR.ONCLEAR)
    }
  }
}

export const FPVGraphics = memo(function FPVGraphics({
  width,
  height,
}: GraphicsProps) {
  const screensize = useScreenSize()
  const islowrez = useDeviceData((s) => s.islowrez)
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * drawwidth
  const viewheight = height * drawheight
  const boarddrawwidth = BOARD_WIDTH * drawwidth
  const boarddrawheight = BOARD_HEIGHT * drawheight
  const cameraz = 512 + drawheight * 0.55
  const sidebarnudge = screensize.viewwidth - viewwidth
  const centerx = viewwidth * -0.5 + sidebarnudge * -0.5
  const centery = viewheight * 0.5

  const positionref = useRef<Group>(null)
  const tiltref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const cameraref = useRef<PerspectiveCameraImpl>(null)
  const dofboardref = useRef<Group>(null)
  const liveboardref = useRef<Group>(null)
  const depthoffield = useRef<DepthOfFieldEffect>(null)
  const dofplayerworld = useRef(new Vector3())
  const dofcamworld = useRef(new Vector3())
  const lastprojfovref = useRef(Number.NaN)
  const [boardcamera, setboardcamera] = useState<PerspectiveCameraImpl | null>(
    null,
  )
  const [panview, setpanview] = useState<PanView>(PANVIEW_IDLE)
  const panviewref = useRef(panview)
  panviewref.current = panview
  const [exitpreviewepoch, setexitpreviewepoch] = useState(0)

  const bindboardcamera = useCallback((c: PerspectiveCameraImpl | null) => {
    cameraref.current = c
    setboardcamera((prev) => (prev === c ? prev : c))
  }, [])

  useFrame((_, delta) => {
    if (
      !positionref.current ||
      !tiltref.current ||
      !underref.current ||
      !cameraref.current
    ) {
      return
    }

    const { gadget } = useGadgetClient.getState()
    const control = readgadgetcontrol(gadget)
    const currentboard = gadget.board

    const animrate = 0.05
    const animrateslow = 0.111

    const userdata = (cameraref.current.userData ??= {})
    if (initfocusifneeded(userdata, control, currentboard)) {
      userdata.lfocusx = control.focusx
      userdata.lfocusy = control.focusy
      userdata.lfacing = control.facing
      userdata.sway = 0
      userdata.vsway = 0
      userdata.lean = 0
      userdata.vlean = 0
    }

    const boardchanged = currentboard !== userdata.currentboard
    if (boardchanged) {
      userdata.sway = 0
      userdata.vsway = 0
      userdata.lean = 0
      userdata.vlean = 0
    }

    if (
      !boardchanged &&
      (userdata.lfocusx !== control.focusx ||
        userdata.lfocusy !== control.focusy)
    ) {
      const swayscale = 7
      const leanscale = 0.02
      const dx = (userdata.lfocusx ?? control.focusx) - control.focusx
      const dy = (userdata.lfocusy ?? control.focusy) - control.focusy
      const mappedfacing = Math.round(control.facing / (Math.PI * 0.5))
      switch (mappedfacing) {
        default:
        case 0: // north
          userdata.vsway = dy * swayscale
          userdata.vlean = dx * leanscale
          break
        case 1: // east
          userdata.vsway = -dx * swayscale
          userdata.vlean = dy * leanscale
          break
        case 2: // south
          userdata.vsway = -dy * swayscale
          userdata.vlean = -dx * leanscale
          break
        case 3: // west
          userdata.vsway = dx * swayscale
          userdata.vlean = -dy * leanscale
          break
      }
    }

    if (userdata.lfacing !== control.facing) {
      let df = control.facing - (userdata.lfacing ?? control.facing)
      if (df < -Math.PI) {
        df += Math.PI * 2
      } else if (df > Math.PI) {
        df += Math.PI * -2
      }
      const leanscale = 0.02
      userdata.vlean = df * leanscale
      userdata.lfacing = control.facing
    }

    stepfocuswithboardtransition(
      userdata,
      control,
      currentboard,
      control.focusx,
      control.focusy,
      delta,
    )
    // Live board world offset: useLayoutEffect only (useFrame ahead of React remount = void).
    stashfocusexitsnap(userdata, gadgettoexitsnap(gadget))

    const bias = readgridbias(userdata)
    const panphase = isfocuspanphase(userdata)
    const nextpanview: PanView = {
      panphase,
      biasdx: bias.dx,
      biasdy: bias.dy,
    }
    if (!panviewequals(nextpanview, panviewref.current)) {
      setpanview(nextpanview)
    }
    if (boardchanged) {
      setexitpreviewepoch((epoch) => epoch + 1)
    }

    const fx = ((userdata.focusx ?? control.focusx) + 0.5) * drawwidth
    const fy = ((userdata.focusy ?? control.focusy) + 0.5) * drawheight
    const srange = 1.2

    // Goto / non-edge: snap camera. Edge pan: damp in world space (no teleport).
    if (boardchanged && !panphase) {
      positionref.current.position.set(fx, -fy, cameraz)
      const rsx = Math.sin(userdata.sway ?? 0) * srange
      const rsy = Math.abs(Math.sin(userdata.sway ?? 0) * srange)
      cameraref.current.position.set(rsx, 0, rsy)
      cameraref.current.rotation.set(Math.PI * -0.49, 0, userdata.lean ?? 0)
    } else {
      damp3(positionref.current.position, [fx, -fy, cameraz], animrate, delta)
    }

    dampE(
      tiltref.current.rotation,
      [0, 0, Math.PI - control.facing],
      animrate,
      delta,
    )

    dampE(
      cameraref.current.rotation,
      [Math.PI * -0.49, 0, userdata.lean ?? 0],
      animrate,
      delta,
    )

    const swx = Math.sin(userdata.sway ?? 0) * srange
    const swy = Math.abs(Math.sin(userdata.sway ?? 0) * srange)
    damp3(cameraref.current.position, [swx, 0, swy], animrate, delta)

    userdata.sway = (userdata.sway ?? 0) + (userdata.vsway ?? 0) * delta
    damp(cameraref.current.userData, 'vsway', 0, animrateslow)

    damp(cameraref.current.userData, 'lean', userdata.vlean ?? 0, animrateslow)
    damp(cameraref.current.userData, 'vlean', 0, animrateslow)

    damp(cameraref.current, 'fov', maptofov(control.viewscale), animrate, delta)
    const lpr = lastprojfovref.current
    if (
      !Number.isFinite(lpr) ||
      Math.abs(cameraref.current.fov - lpr) > FOV_MATRIX_EPS
    ) {
      cameraref.current.updateProjectionMatrix()
      lastprojfovref.current = cameraref.current.fov
    }

    const xscale = clamp(viewwidth / boarddrawwidth, 1.0, 10.0)
    const yscale = clamp(viewheight / boarddrawheight, 1.0, 10.0)
    const rscale = Math.max(xscale, yscale)
    const rwidth = boarddrawwidth * rscale
    const rheight = boarddrawheight * rscale
    underref.current.position.x = viewwidth - rwidth
    underref.current.position.y = viewheight - rheight
    underref.current.scale.setScalar(rscale)

    if (depthoffield.current) {
      switch (control.viewscale) {
        case VIEWSCALE.NEAR:
          depthoffield.current.bokehScale = 10
          depthoffield.current.cocMaterial.worldFocusRange = 1800
          break
        default:
        case VIEWSCALE.MID:
          depthoffield.current.bokehScale = 10
          depthoffield.current.cocMaterial.worldFocusRange = 2550
          break
        case VIEWSCALE.FAR:
          depthoffield.current.bokehScale = 10
          depthoffield.current.cocMaterial.worldFocusRange = 2550
          break
      }

      const playerspritez = maxspriteslayerz(layers, 'fpv')
      if (
        setdofplayerworld(
          dofplayerworld.current,
          liveboardref.current,
          control.focusx,
          control.focusy,
          drawwidth,
          drawheight,
          playerspritez,
        )
      ) {
        cameraref.current.getWorldPosition(dofcamworld.current)
        depthoffield.current.cocMaterial.focusDistance =
          dofcamworld.current.distanceTo(dofplayerworld.current)
      }
    }

    if (liveboardref.current) {
      tickerpublishfromtickers({
        tickers: gadget.tickers ?? [],
        layers,
        boardgroup: liveboardref.current,
        camera: cameraref.current,
        drawwidth,
        drawheight,
        cols: width,
        rows: height,
        boardz: maxspriteslayerz(layers, 'fpv'),
      })
    }
  })

  // re-render when board or layer counts change (board change must trigger re-render)
  useGadgetClient((state) => state.gadget.board)
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)
  useGadgetClient(
    useShallow((state) => ({
      exiteast: state.gadget.exiteast,
      exitwest: state.gadget.exitwest,
      exitnorth: state.gadget.exitnorth,
      exitsouth: state.gadget.exitsouth,
      exiteast2: state.gadget.exiteast2,
      exitwest2: state.gadget.exitwest2,
      exitnorth2: state.gadget.exitnorth2,
      exitsouth2: state.gadget.exitsouth2,
      exitne: state.gadget.exitne,
      exitnw: state.gadget.exitnw,
      exitse: state.gadget.exitse,
      exitsw: state.gadget.exitsw,
    })),
  )

  const { gadget, layercachemap } = useGadgetClient.getState()
  const { over = [], under = [], layers = [] } = gadget
  const camuserdata = cameraref.current?.userData ?? {}
  const boardid = gadget.board ?? ''
  const visualpan = resolvepanviewforrender(panview, camuserdata, boardid)
  const rendergrid = readboardgridforrender(camuserdata, boardid)

  // Wait-before-start: offset live board only after exit-preview strip commits.
  useLayoutEffect(() => {
    syncliveboardworldoffset(
      liveboardref.current,
      cameraref.current?.userData ?? {},
      boardid,
      drawwidth,
      drawheight,
    )
  }, [
    boardid,
    rendergrid.x,
    rendergrid.y,
    visualpan.panphase,
    visualpan.biasdx,
    visualpan.biasdy,
    drawwidth,
    drawheight,
  ])

  const exitpreviewgroups = buildexitpreviewgroups(
    gadget,
    layercachemap,
    drawwidth,
    drawheight,
    {
      boardgridx: rendergrid.x,
      boardgridy: rendergrid.y,
      bias: { dx: visualpan.biasdx, dy: visualpan.biasdy },
      panphase: visualpan.panphase,
      exitsnap: camuserdata.exitsnap,
    },
  )
  const inspectorz = boardinspectorzfromgadgetstacks(
    'fpv',
    layers,
    over,
    exitpreviewgroups.map((g) => g.preview.layers),
  )

  const multi = over.length > 0
  const layersindex = under.length * 2 + 2
  const fpvdprscale = islowrez ? 0.5 : 1

  return (
    <>
      <group ref={positionref}>
        <group ref={tiltref}>
          <perspectiveCamera
            ref={bindboardcamera}
            near={0.1}
            far={3000}
            aspect={-viewwidth / viewheight}
            position={[0, drawheight * -0.5, 0]}
          />
        </group>
      </group>
      <group ref={underref}>
        {under.map((layer, i) => (
          <FlatLayer key={layer.id} from="under" id={layer.id} z={i * 2} />
        ))}
      </group>
      <group position-z={layersindex}>
        {boardcamera && (
          <RenderLayer
            camera={boardcamera}
            viewwidth={viewwidth}
            viewheight={viewheight}
            dprscale={fpvdprscale}
            effects={
              <>
                <DepthOfField ref={depthoffield} />
                {!islowrez && <DepthFog />}
              </>
            }
          >
            <group ref={dofboardref} position={[centerx, centery, 0]}>
              <group ref={liveboardref}>
                {layers.map((layer) =>
                  layer.type !== LAYER_TYPE.SPRITES ? (
                    <FPVLayer
                      key={layer.id}
                      id={layer.id}
                      from="layers"
                      z={maptolayerz(layer, 'fpv')}
                      multi={multi}
                    />
                  ) : null,
                )}
                <BoardTvSink graphics="fpv" />
                {layers.map((layer) =>
                  layer.type === LAYER_TYPE.SPRITES ? (
                    <FPVLayer
                      key={layer.id}
                      id={layer.id}
                      from="layers"
                      z={maptolayerz(layer, 'fpv')}
                      multi={multi}
                    />
                  ) : null,
                )}
                {over.map((layer) => (
                  <FPVLayer
                    key={layer.id}
                    from="over"
                    id={layer.id}
                    z={maptolayerz(layer, 'fpv') + drawheight + 1}
                    multi={multi}
                  />
                ))}
                <InspectorComponent z={inspectorz} />
              </group>
              {exitpreviewgroups.map(({ key, preview, position }) => {
                if (preview.layers.length > 0) {
                  return (
                    <group
                      key={`${exitpreviewepoch}-${key}`}
                      position={position}
                    >
                      {preview.layers.map((layer) => (
                        <FPVLayer
                          key={layer.id}
                          id={layer.id}
                          layers={preview.layers}
                          z={maptolayerz(layer, 'fpv')}
                          multi={multi}
                        />
                      ))}
                    </group>
                  )
                }
                if (CARDINAL_PREVIEW_KEYS.has(key)) {
                  return (
                    <group key={key} position={position} scale-z={2}>
                      <PillarwMeshes
                        width={BOARD_WIDTH}
                        char={edgechars}
                        color={edgecolors}
                        bg={edgebgs}
                      />
                    </group>
                  )
                }
                return null
              })}
            </group>
          </RenderLayer>
        )}
      </group>
    </>
  )
})
