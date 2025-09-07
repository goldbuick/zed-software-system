import { EffectComposer } from '@react-three/postprocessing'
import { CopyPass, EffectComposer as EffectComposerImpl } from 'postprocessing'
import { ReactNode, useLayoutEffect, useRef } from 'react'
import { Texture, WebGLRenderTarget } from 'three'
import { ispresent } from 'zss/mapping/types'

import { RenderTexture } from './rendertexture'

type RenderLayerProps = {
  viewwidth: number
  viewheight: number
  effects: ReactNode
  children?: ReactNode
}

export function RenderLayer({
  viewwidth,
  viewheight,
  effects,
  children,
}: RenderLayerProps) {
  const fbo = useRef<WebGLRenderTarget<Texture>>(null)
  const effectcomposer = useRef<EffectComposerImpl>(null)
  const copypass = useRef<CopyPass>(null)

  const hasfbo = !!fbo.current
  const haseffectcomposer = !!effectcomposer.current
  const numberofpasses = effectcomposer.current?.passes.length ?? 0

  useLayoutEffect(() => {
    console.info(fbo, effectcomposer, copypass, numberofpasses)
    if (
      ispresent(fbo.current) &&
      ispresent(effectcomposer.current) &&
      !ispresent(copypass.current) &&
      numberofpasses > 1
    ) {
      copypass.current = new CopyPass(fbo.current)
      effectcomposer.current.autoRenderToScreen = false
      effectcomposer.current.addPass(copypass.current)
    }
  }, [hasfbo, haseffectcomposer, numberofpasses])

  return (
    <mesh position={[viewwidth * 0.5, viewheight * 0.5, 0]}>
      <planeGeometry args={[viewwidth, viewheight]} />
      <meshBasicMaterial transparent>
        <RenderTexture
          ref={fbo}
          attach="map"
          width={viewwidth}
          height={viewheight}
          depthBuffer
          stencilBuffer={false}
          generateMipmaps={false}
          renderPriority={0}
        >
          {children}
          {/* <EffectComposer
            ref={effectcomposer}
            multisampling={0}
            renderPriority={-2}
          >
            {effects as React.JSX.Element | React.JSX.Element[]}
          </EffectComposer> */}
        </RenderTexture>
      </meshBasicMaterial>
    </mesh>
  )
}
