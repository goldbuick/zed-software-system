import { EffectComposerContext } from '@react-three/postprocessing'
import { CopyPass } from 'postprocessing'
import { ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { Texture, WebGLRenderTarget } from 'three'
import { ispresent } from 'zss/mapping/types'

import { EffectComposer } from './effectcomposer'
import { RenderTexture } from './rendertexture'

type RenderToTargetProps = {
  fbo: WebGLRenderTarget<Texture>
  effects: () => ReactNode
}

function RenderEffects({ fbo, effects }: RenderToTargetProps) {
  const [copyPass] = useState(() => new CopyPass(fbo, true))
  const { composer } = useContext(EffectComposerContext)

  console.info(composer)

  useEffect(() => {
    return () => {
      copyPass.dispose()
    }
  }, [copyPass])

  return (
    <>
      {effects()}
      <primitive object={copyPass} dispose={null} />
    </>
  )
}

type RenderLayerProps = {
  viewwidth: number
  viewheight: number
  effects: () => ReactNode
  children?: ReactNode
}

export function RenderLayer({
  viewwidth,
  viewheight,
  effects,
  children,
}: RenderLayerProps) {
  const fbo = useRef<WebGLRenderTarget<Texture>>(null)
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
        >
          {children}
          {ispresent(fbo.current) && (
            <EffectComposer multisampling={0} renderPriority={100}>
              <RenderEffects fbo={fbo.current} effects={effects} />
            </EffectComposer>
          )}
        </RenderTexture>
      </meshBasicMaterial>
    </mesh>
  )
}
