import { useFBO } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Glitch } from '@react-three/postprocessing'
import { damp } from 'maath/easing'
import {
  BlendFunction,
  BloomEffect,
  CopyPass,
  GlitchMode,
  KernelSize,
  NoiseEffect,
} from 'postprocessing'
import { ReactNode, memo, useEffect, useMemo, useRef, useState } from 'react'
import type { Camera } from 'three'
import { Texture, Vector2, WebGLRenderTarget } from 'three'
import { useDeviceData } from 'zss/gadget/device'
import { useGlitchPulse } from 'zss/gadget/fx/glitchpulse'
import { EffectComposer } from 'zss/gadget/graphics/effectcomposer'
import { useMedia } from 'zss/gadget/media'

import { RenderTexture } from './rendertexture'

/** maath damp smoothTime -- seconds to approach target. */
const MOOD_FX_ANIM_RATE = 0.55
const NOISE_OPACITY_ON = 0.5
const BLOOM_INTENSITY_ON = 0.111

function MoodNoise({ dark }: { dark: boolean }) {
  const target = dark ? NOISE_OPACITY_ON : 0
  const targetref = useRef(target)
  targetref.current = target
  const effect = useMemo(() => {
    const noise = new NoiseEffect({
      premultiply: true,
      blendFunction: BlendFunction.DARKEN,
    })
    noise.blendMode.opacity.value = target
    return noise
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot; damp drives opacity
  }, [])
  useEffect(() => () => effect.dispose(), [effect])
  useFrame((_, delta) => {
    damp(
      effect.blendMode.opacity,
      'value',
      targetref.current,
      MOOD_FX_ANIM_RATE,
      delta,
    )
  })
  return <primitive object={effect} dispose={null} />
}

function MoodBloom({
  bright,
  kernelsize,
}: {
  bright: boolean
  kernelsize: KernelSize
}) {
  const target = bright ? BLOOM_INTENSITY_ON : 0
  const targetref = useRef(target)
  targetref.current = target
  const effect = useMemo(
    () =>
      new BloomEffect({
        intensity: target,
        mipmapBlur: false,
        luminanceThreshold: 0.5,
        luminanceSmoothing: 0.001,
        kernelSize: kernelsize,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot; damp drives intensity; kernel updates below
    [],
  )
  useEffect(() => () => effect.dispose(), [effect])
  useEffect(() => {
    effect.kernelSize = kernelsize
  }, [effect, kernelsize])
  useFrame((_, delta) => {
    damp(effect, 'intensity', targetref.current, MOOD_FX_ANIM_RATE, delta)
  })
  return <primitive object={effect} dispose={null} />
}

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
      <MoodNoise dark={mood.includes('dark')} />
      <MoodBloom bright={mood.includes('bright')} kernelsize={bloomkernel} />
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
