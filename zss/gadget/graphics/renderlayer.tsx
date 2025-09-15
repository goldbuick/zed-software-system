import { useFBO } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Bloom, Glitch, Noise } from '@react-three/postprocessing'
import { BlendFunction, CopyPass, GlitchMode, KernelSize } from 'postprocessing'
import { Fragment, ReactNode, useEffect, useState } from 'react'
import type { Camera } from 'three'
import { Texture, WebGLRenderTarget } from 'three'

import { useMedia } from '../hooks'

import { EffectComposer } from './effectcomposer'
import { RenderTexture } from './rendertexture'

type RenderToTargetProps = {
  fbo: WebGLRenderTarget<Texture>
  effects: ReactNode
}

function RenderEffects({ fbo, effects }: RenderToTargetProps) {
  const { mood } = useMedia()
  const [copyPass] = useState(() => new CopyPass(fbo, true))

  useEffect(() => {
    return () => {
      copyPass.dispose()
    }
  }, [copyPass])

  return (
    <>
      {mood.includes('dark') && (
        <Fragment key="mood">
          <Glitch
            delay={[10, 60 * 2]} // min and max glitch delay
            duration={[0.1, 3.0]} // min and max glitch duration
            strength={[0, 1]} // min and max glitch strength
            mode={GlitchMode.SPORADIC} // glitch mode
            active // turn on/off the effect (switches between "mode" prop and GlitchMode.DISABLED)
            ratio={0.5} // Threshold for strong glitches, 0 - no weak glitches, 1 - no strong glitches.
          />
          <Noise
            opacity={0.5}
            premultiply // enables or disables noise premultiplication
            blendFunction={BlendFunction.DARKEN} // blend mode
          />
        </Fragment>
      )}
      {mood.includes('bright') && (
        <Fragment key="mood">
          <Bloom
            intensity={0.111}
            mipmapBlur={false}
            luminanceThreshold={0.5}
            luminanceSmoothing={0.001}
            kernelSize={KernelSize.VERY_LARGE}
          />
        </Fragment>
      )}
      {effects}
      <primitive object={copyPass} dispose={null} />
    </>
  )
}

type RenderLayerProps = {
  camera: Camera
  viewwidth: number
  viewheight: number
  effects: ReactNode
  children?: ReactNode
}

export function RenderLayer({
  camera,
  viewwidth,
  viewheight,
  effects,
  children,
}: RenderLayerProps) {
  const { mood } = useMedia()
  const { viewport } = useThree()
  const fbo = useFBO(viewwidth * viewport.dpr, viewheight * viewport.dpr, {
    samples: 0,
    stencilBuffer: false,
    depthBuffer: true,
    generateMipmaps: false,
  })
  const hvw = viewwidth * 0.5
  const hvh = viewheight * 0.5
  return (
    <>
      <mesh position={[hvw, hvh, 0]}>
        <planeGeometry args={[viewwidth, viewheight]} />
        <meshBasicMaterial transparent>
          <RenderTexture attach="map" fbo={fbo}>
            {children}
            <EffectComposer
              key={mood}
              camera={camera}
              width={viewwidth}
              height={viewheight}
            >
              <RenderEffects fbo={fbo} effects={effects} />
            </EffectComposer>
          </RenderTexture>
        </meshBasicMaterial>
      </mesh>
    </>
  )
}
