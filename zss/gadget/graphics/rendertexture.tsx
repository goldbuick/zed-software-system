/* eslint-disable react/prop-types */
import { useFBO } from '@react-three/drei'
import { ForwardRefComponent } from '@react-three/drei/helpers/ts-utils'
import { ThreeElements, createPortal, useThree } from '@react-three/fiber'
import * as React from 'react'
import * as THREE from 'three'

export type RenderTextureProps = Omit<
  ThreeElements['texture'],
  'ref' | 'args'
> & {
  /** Optional width of the texture, defaults to viewport bounds */
  width: number
  /** Optional height of the texture, defaults to viewport bounds */
  height: number
  /** Optional fbo samples */
  samples?: number
  /** Optional stencil buffer, defaults to false */
  stencilBuffer?: boolean
  /** Optional depth buffer, defaults to true */
  depthBuffer?: boolean
  /** Optional generate mipmaps, defaults to false */
  generateMipmaps?: boolean
  /** Optional render priority, defaults to 0 */
  renderPriority?: number
  /** Optional event priority, defaults to 0 */
  eventPriority?: number
  /** Optional frame count, defaults to Infinity. If you set it to 1, it would only render a single frame, etc */
  frames?: number
  /** Optional event compute, defaults to undefined */
  compute?: (event: any, state: any, previous: any) => false | undefined
  /** Children will be rendered into a portal */
  children: React.ReactNode
}

export const RenderTexture: ForwardRefComponent<
  RenderTextureProps,
  THREE.RenderTarget
> = /* @__PURE__ */ React.forwardRef(function RenderTexture(
  {
    children,
    compute,
    width,
    height,
    samples = 8,
    eventPriority = 0,
    stencilBuffer = false,
    depthBuffer = true,
    generateMipmaps = false,
    ...props
  },
  forwardRef,
) {
  const { viewport } = useThree()
  const fbo = useFBO(width * viewport.dpr, height * viewport.dpr, {
    samples,
    stencilBuffer,
    depthBuffer,
    generateMipmaps,
  })
  const [vScene] = React.useState(() => new THREE.Scene())

  const uvCompute = React.useCallback(
    (event: any, state: any, previous: any) => {
      // Since this is only a texture it does not have an easy way to obtain the parent, which we
      // need to transform event coordinates to local coordinates. We use r3f internals to find the
      // next Object3D.
      let parent = (fbo.texture as any)?.__r3f.parent?.object
      while (parent && !(parent instanceof THREE.Object3D)) {
        parent = parent.__r3f.parent?.object
      }
      if (!parent) return false
      // First we call the previous state-onion-layers compute, this is what makes it possible to nest portals
      if (!previous.raycaster.camera)
        previous.events.compute(
          event,
          previous,
          previous.previousRoot?.getState(),
        )
      // We run a quick check against the parent, if it isn't hit there's no need to raycast at all
      const [intersection] = previous.raycaster.intersectObject(parent)
      if (!intersection) return false
      // We take that hits uv coords, set up this layers raycaster, et voilà, we have raycasting on arbitrary surfaces
      const uv = intersection.uv
      if (!uv) return false
      state.raycaster.setFromCamera(
        state.pointer.set(uv.x * 2 - 1, uv.y * 2 - 1),
        state.camera,
      )
    },
    [fbo.texture],
  )

  React.useImperativeHandle(forwardRef, () => fbo, [fbo])

  return (
    <>
      {createPortal(
        <>
          {children}
          {/* Without an element that receives pointer events state.pointer will always be 0/0 */}
          <group onPointerOver={() => null} />
        </>,
        vScene,
        {
          events: { compute: compute ?? uvCompute, priority: eventPriority },
        },
      )}
      <primitive object={fbo.texture} {...props} />
    </>
  )
})
