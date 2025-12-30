/* eslint-disable react/prop-types */
/* eslint-disable react/no-unknown-property */
import { ForwardRefComponent } from '@react-three/drei/helpers/ts-utils'
import { ThreeElements, createPortal } from '@react-three/fiber'
import { ReactNode, forwardRef, useImperativeHandle, useState } from 'react'
import * as THREE from 'three'

export type RenderTextureProps = Omit<
  ThreeElements['texture'],
  'ref' | 'args'
> & {
  fbo: THREE.WebGLRenderTarget<THREE.Texture>
  /** Children will be rendered into a portal */
  children: ReactNode
}

export const RenderTexture: ForwardRefComponent<
  RenderTextureProps,
  THREE.RenderTarget
> = /* @__PURE__ */ forwardRef(function RenderTexture(
  { children, fbo, ...props },
  forwardRef,
) {
  const [vScene] = useState(() => new THREE.Scene())
  useImperativeHandle(forwardRef, () => fbo, [fbo])
  return (
    <>
      {createPortal(
        <>
          {children}
          {/* Without an element that receives pointer events state.pointer will always be 0/0 */}
          <group onPointerOver={() => null} />
        </>,
        vScene,
      )}
      <primitive object={fbo.texture} {...props} />
    </>
  )
})
