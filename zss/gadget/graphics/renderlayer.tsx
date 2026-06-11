import { useFBO } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Bloom, Glitch, Noise } from '@react-three/postprocessing'
import { BlendFunction, CopyPass, GlitchMode, KernelSize } from 'postprocessing'
import { Fragment, ReactNode, memo, useEffect, useState } from 'react'
import type { Camera } from 'three'
import { Texture, Vector2, WebGLRenderTarget } from 'three'
import { useDeviceData } from 'zss/gadget/device'
import { useGlitchPulse } from 'zss/gadget/fx/glitchpulse'
import { EffectComposer } from 'zss/gadget/graphics/effectcomposer'
import { useMedia } from 'zss/gadget/media'

import { RenderTexture } from './rendertexture'

type RenderToTargetProps = {
  fbo: WebGLRenderTarget<Texture>
  effects: ReactNode
}

function RenderEffects({ fbo, effects }: RenderToTargetProps) {
  const { mood } = useMedia()
  const islowrez = useDeviceData((s) => s.islowrez)
  const bloomkernel = islowrez ? KernelSize.MEDIUM : KernelSize.VERY_LARGE
  const [copyPass] = useState(() => new CopyPass(fbo, true))

  useEffect(() => {
    return () => {
      copyPass.dispose()
    }
  }, [copyPass])

  const glitchactive = useGlitchPulse((state) => state.glitchactive)

  return (
    <>
      {glitchactive && (
        <Glitch
          key="glitch"
          delay={new Vector2(0.05, 0.35)}
          duration={new Vector2(0.06, 0.28)}
          strength={new Vector2(0.06, 0.38)}
          mode={GlitchMode.CONSTANT_WILD}
          active
          ratio={0.42}
        />
      )}
      {mood.includes('dark') && (
        <Fragment key="dark">
          <Noise
            opacity={0.5}
            premultiply // enables or disables noise premultiplication
            blendFunction={BlendFunction.DARKEN} // blend mode
          />
        </Fragment>
      )}
      {mood.includes('bright') && (
        <Fragment key="bright">
          <Bloom
            intensity={0.111}
            mipmapBlur={false}
            luminanceThreshold={0.5}
            luminanceSmoothing={0.001}
            kernelSize={bloomkernel}
          />
        </Fragment>
      )}
      {effects}
      <primitive object={copyPass} dispose={null} />
    </>
  )
}

type RenderLayerProps = {
  /** Null until the board camera exists inside the render portal (same scene as FBO content). */
  camera: Camera | null
  viewwidth: number
  viewheight: number
  effects: ReactNode
  children?: ReactNode
  /** Multiplier for viewport DPR when allocating the FBO (e.g. 0.5 on lowrez). */
  dprscale?: number
}

export const RenderLayer = memo(function RenderLayer({
  camera,
  viewwidth,
  viewheight,
  effects,
  children,
  dprscale = 1,
}: RenderLayerProps) {
  const { mood } = useMedia()
  const { viewport } = useThree()
  useGlitchPulse((state) => state.glitchactive)

  const dpr = viewport.dpr * dprscale
  const fbo = useFBO(viewwidth * dpr, viewheight * dpr, {
    samples: 0,
    depthBuffer: true,
    stencilBuffer: false,
    generateMipmaps: false,
  })
  const hvw = viewwidth * 0.5
  const hvh = viewheight * 0.5
  return (
    <>
      <mesh position={[hvw, hvh, 0]}>
        <planeGeometry args={[viewwidth, viewheight]} />
        <meshBasicMaterial transparent>
          <RenderTexture attach="map" fbo={fbo} boardcamera={camera}>
            {children}
            {camera && (
              <EffectComposer
                key={mood}
                camera={camera}
                width={viewwidth}
                height={viewheight}
                detachedbuffersize
                dprscale={dprscale}
              >
                <RenderEffects fbo={fbo} effects={effects} />
              </EffectComposer>
            )}
          </RenderTexture>
        </meshBasicMaterial>
      </mesh>
    </>
  )
})
