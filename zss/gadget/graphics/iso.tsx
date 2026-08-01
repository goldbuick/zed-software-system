import { useFrame } from '@react-three/fiber'
import { DepthOfField } from '@react-three/postprocessing'
import { damp, damp3 } from 'maath/easing'
import { DepthOfFieldEffect } from 'postprocessing'
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'
import {
  Group,
  OrthographicCamera as OrthographicCameraImpl,
  Vector3,
} from 'three'
import { RUNTIME } from 'zss/config'
import { VIEWSCALE, layersreadcontrol } from 'zss/gadget/data/types'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { boardinspectorzfromgadgetstacks } from 'zss/gadget/graphics/boardinspectorz'
import {
  FOCUS_ANIM_RATE,
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
import { IsoLayer } from 'zss/gadget/graphics/isolayer'
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
import { RenderLayer } from 'zss/gadget/graphics/renderlayer'
import { tickerpublishfromtickers } from 'zss/gadget/graphics/tickeranchors'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { InspectorComponent } from 'zss/screens/inspector/component'
import { useShallow } from 'zustand/react/shallow'

/** Scene tilt for isometric view (π/4 on X, −π/4 on Z). */
const ISO_SCENE_ROTATION: [number, number, number] = [
  Math.PI * 0.25,
  0,
  Math.PI * -0.25,
]

type GraphicsProps = {
  width: number
  height: number
}

function maptoscale(viewscale: VIEWSCALE): number {
  switch (viewscale) {
    case VIEWSCALE.NEAR:
      return 3
    default:
    case VIEWSCALE.MID:
      return 1.75
    case VIEWSCALE.FAR:
      return 1
  }
}

function clampfocus(
  focusx: number,
  focusy: number,
  viewscale: VIEWSCALE,
  viewwidth: number,
  viewheight: number,
  drawwidth: number,
  drawheight: number,
) {
  const charwidth = drawwidth * viewscale
  const charheight = drawheight * viewscale
  const margin = 0.5
  const cols = Math.floor((viewwidth * 0.5) / charwidth) * margin
  const rows = Math.floor((viewheight * 0.5) / charheight) * margin
  return [
    clamp(focusx, cols, BOARD_WIDTH - cols - 1),
    clamp(focusy, rows, BOARD_HEIGHT - rows - 1),
  ]
}

export const IsoGraphics = memo(function IsoGraphics({
  width,
  height,
}: GraphicsProps) {
  const screensize = useScreenSize()
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * drawwidth
  const viewheight = height * drawheight
  const boarddrawwidth = BOARD_WIDTH * drawwidth
  const boarddrawheight = BOARD_HEIGHT * drawheight
  const sidebarnudge = screensize.viewwidth - viewwidth
  const centerx = viewwidth * -0.5 + sidebarnudge * -0.5
  const centery = viewheight * 0.5

  const zoomref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const cornerref = useRef<Group>(null)
  const liveboardref = useRef<Group>(null)
  const cameraref = useRef<OrthographicCameraImpl>(null)
  const [boardcamera, setboardcamera] = useState<OrthographicCameraImpl | null>(
    null,
  )
  const depthoffield = useRef<DepthOfFieldEffect>(null)
  const dofplayerworld = useRef(new Vector3())
  const dofcamworld = useRef(new Vector3())
  const [panview, setpanview] = useState<PanView>(PANVIEW_IDLE)
  const panviewref = useRef(panview)
  panviewref.current = panview

  const bindboardcamera = useCallback((c: OrthographicCameraImpl | null) => {
    cameraref.current = c
    setboardcamera((prev) => (prev === c ? prev : c))
  }, [])

  useFrame((_, delta) => {
    if (
      !zoomref.current ||
      !underref.current ||
      !cornerref.current ||
      !cameraref.current ||
      !depthoffield.current
    ) {
      return
    }

    // camera focus logic
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    const animrate = FOCUS_ANIM_RATE
    const currentboard = useGadgetClient.getState().gadget.board

    // tracking state
    const userdata = (cameraref.current.userData ??= {})
    if (initfocusifneeded(userdata, control, currentboard)) {
      zoomref.current.scale.setScalar(control.viewscale)
    }

    damp3(zoomref.current.scale, maptoscale(control.viewscale), animrate, delta)

    cornerref.current.updateWorldMatrix(true, false)
    cameraref.current.updateProjectionMatrix()
    cameraref.current.updateWorldMatrix(true, false)

    const [tfocusx, tfocusy] = clampfocus(
      control.focusx,
      control.focusy,
      control.viewscale,
      viewwidth,
      viewheight,
      drawwidth,
      drawheight,
    )

    const boardchanged = currentboard !== userdata.currentboard
    stepfocuswithboardtransition(
      userdata,
      control,
      currentboard,
      tfocusx,
      tfocusy,
      delta,
    )
    const gadgetforstash = useGadgetClient.getState().gadget
    stashfocusexitsnap(userdata, gadgettoexitsnap(gadgetforstash))

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

    const fx = (userdata.focusx! + 0.5) * drawwidth
    const fy = (userdata.focusy! + 0.5) * drawheight
    const targetcornerx = -fx
    const targetcornery = -fy

    // #goto / non-edge: hard snap corner. Edge pan: damp along travel axis.
    if (boardchanged && !panphase) {
      cornerref.current.position.set(targetcornerx, targetcornery, 0)
    } else if (panphase && bias.dx !== 0) {
      cornerref.current.position.y = targetcornery
      damp(cornerref.current.position, 'x', targetcornerx, animrate, delta)
    } else if (panphase && bias.dy !== 0) {
      cornerref.current.position.x = targetcornerx
      damp(cornerref.current.position, 'y', targetcornery, animrate, delta)
    } else {
      damp3(cornerref.current.position, [-fx, -fy, 0], animrate, delta)
    }

    // update dof (range/bokeh per zoom; focus distance tracks player in world space)
    switch (control.viewscale) {
      case VIEWSCALE.NEAR:
        depthoffield.current.bokehScale = 5
        depthoffield.current.cocMaterial.worldFocusRange = 1500
        break
      default:
      case VIEWSCALE.MID:
        depthoffield.current.bokehScale = 5
        depthoffield.current.cocMaterial.worldFocusRange = 1500
        break
      case VIEWSCALE.FAR:
        depthoffield.current.bokehScale = 5
        depthoffield.current.cocMaterial.worldFocusRange = 2250
        break
    }

    const gadget = useGadgetClient.getState().gadget
    const gadgetlayers = gadget.layers ?? []
    const playerspritez = maxspriteslayerz(gadgetlayers, 'iso')
    if (
      depthoffield.current &&
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

    if (liveboardref.current) {
      tickerpublishfromtickers({
        tickers: gadget.tickers ?? [],
        layers: gadgetlayers,
        boardgroup: liveboardref.current,
        camera: cameraref.current,
        drawwidth,
        drawheight,
        cols: width,
        rows: height,
        boardz: playerspritez,
      })
    }

    // camera changes
    cameraref.current.updateProjectionMatrix()

    // framing
    const xscale = clamp(viewwidth / boarddrawwidth, 1.0, 10.0)
    const yscale = clamp(viewheight / boarddrawheight, 1.0, 10.0)
    const rscale = Math.max(xscale, yscale)
    const rwidth = boarddrawwidth * rscale
    const rheight = boarddrawheight * rscale
    underref.current.position.x = viewwidth - rwidth
    underref.current.position.y = viewheight - rheight
    underref.current.scale.setScalar(rscale)
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
    'iso',
    layers,
    over,
    exitpreviewgroups.map((g) => g.preview.layers),
  )

  const layersindex = under.length * 2 + 2
  return (
    <>
      <group position-z={layersindex}>
        <orthographicCamera
          ref={bindboardcamera}
          left={viewwidth * -0.5}
          right={viewwidth * 0.5}
          top={viewheight * -0.5}
          bottom={viewheight * 0.5}
          near={0.1}
          far={2000}
          position={[0, 0, 1000]}
        />
        {boardcamera && (
          <RenderLayer
            camera={boardcamera}
            viewwidth={viewwidth}
            viewheight={viewheight}
            effects={
              <>
                <DepthOfField ref={depthoffield} />
              </>
            }
          >
            <group position={[centerx, centery, -500]}>
              <group rotation={ISO_SCENE_ROTATION}>
                <group ref={zoomref}>
                  <group ref={cornerref}>
                    <group ref={liveboardref}>
                      {layers.map((layer) => (
                        <IsoLayer
                          key={layer.id}
                          id={layer.id}
                          from="layers"
                          z={maptolayerz(layer, 'iso')}
                        />
                      ))}
                      {over.map((layer) => (
                        <IsoLayer
                          key={layer.id}
                          from="over"
                          id={layer.id}
                          z={maptolayerz(layer, 'iso') + drawheight + 1}
                        />
                      ))}
                      <InspectorComponent z={inspectorz} />
                    </group>
                    {exitpreviewgroups.map(({ key, preview, position }) =>
                      preview.layers.length > 0 ? (
                        <group key={key} position={position}>
                          {preview.layers.map((layer) => (
                            <IsoLayer
                              key={layer.id}
                              id={layer.id}
                              layers={preview.layers}
                              z={maptolayerz(layer, 'iso')}
                            />
                          ))}
                        </group>
                      ) : null,
                    )}
                  </group>
                </group>
              </group>
            </group>
          </RenderLayer>
        )}
      </group>
      <group ref={underref}>
        {under.map((layer, i) => (
          <FlatLayer key={layer.id} from="under" id={layer.id} z={i * 2} />
        ))}
      </group>
    </>
  )
})
