/* eslint-disable react/prop-types */
import { ForwardRefComponent } from '@react-three/drei/helpers/ts-utils'
import {
  type DomEvent,
  type RootState,
  ThreeElements,
  createPortal,
} from '@react-three/fiber'
import {
  type ReactNode,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react'
import * as THREE from 'three'

export type RenderTextureProps = Omit<
  ThreeElements['texture'],
  'ref' | 'args'
> & {
  fbo: THREE.WebGLRenderTarget
  /** Children will be rendered into a portal */
  children: ReactNode
  /**
   * Board frustum width in the same logical units as the display plane (RenderLayer `viewwidth`).
   * Used to scale portal U from UV→NDC so the ray matches the framed sub-rect vs full canvas width.
   */
  viewwidth: number
}

type R3fInternalParent = {
  object?: unknown
  __r3f?: { parent?: R3fInternalParent }
}

function textureparentobject(texture: THREE.Texture): THREE.Object3D | null {
  let parent: unknown = (
    texture as unknown as { __r3f?: { parent?: { object?: unknown } } }
  ).__r3f?.parent?.object
  while (parent && !(parent instanceof THREE.Object3D)) {
    parent = (parent as R3fInternalParent).__r3f?.parent?.object
  }
  return parent instanceof THREE.Object3D ? parent : null
}

/**
 * Map pointer through the **display** plane (the mesh that samples this FBO) into the portal
 * camera. Without this, R3F uses the full canvas NDC for the board camera and hits can drift
 * vs the composed texture (especially if the quad is not the only thing on the canvas).
 * Same idea as `@react-three/drei` RenderTexture `uvCompute`.
 */
export const RenderTexture: ForwardRefComponent<
  RenderTextureProps,
  THREE.RenderTarget
> = /* @__PURE__ */ forwardRef(function RenderTexture(
  { children, fbo, viewwidth, ...props },
  forwardRef,
) {
  const [vScene] = useState(() => new THREE.Scene())

  const uvcompute = useCallback(
    (event: DomEvent, state: RootState, previous?: RootState) => {
      // Match `@react-three/drei` RenderTexture `uvCompute`: main pointer from display hit UV only,
      // never seed the portal ray from full-canvas NDC (avoids mis-set ray on early return).
      const parent = textureparentobject(fbo.texture)
      if (!parent || !previous) {
        return false
      }
      const root = previous.get()
      root.events.compute?.(event, root, root.previousRoot?.getState())

      const [intersection] = root.raycaster.intersectObject(parent)
      if (!intersection) {
        return false
      }

      const uv = intersection.uv
      if (!uv) {
        return false
      }

      // Full-canvas width in layout units: read from live root store (not React props) so resize
      // and DPR never leave a stale denominator; matches pointer NDC basis from `events.compute`.
      const fullwidth = root.viewport.width || root.size.width
      // Ortho FBO: linear frustum; scale X so NDC matches framed sub-rect vs full canvas (sidebar).
      // Perspective (mode7): FBO already includes perspective; extra X scaling skews the ray vs UV.
      const isortho = state.camera.type === 'OrthographicCamera'
      const xratio =
        isortho && fullwidth > 0 ? viewwidth / fullwidth : 1
      const puvx = (uv.x * 2 - 1) * xratio
      const puvy = uv.y * 2 - 1

      // Ortho (flat/iso) and perspective (mode7) portal cameras both use the same UV→NDC step;
      // projection is applied inside setFromCamera for the active board camera.
      state.raycaster.setFromCamera(state.pointer.set(puvx, puvy), state.camera)
    },
    [fbo, viewwidth],
  )

  useImperativeHandle(forwardRef, () => fbo, [fbo])
  return (
    <>
      {/* Attach texture first so __r3f parent chain exists before portal events run */}
      <primitive object={fbo.texture} {...props} />
      {createPortal(
        <>
          {children}
          {/* Without an element that receives pointer events state.pointer will always be 0/0 */}
          <group onPointerOver={() => null} />
        </>,
        vScene,
        {
          events: {
            compute: uvcompute,
          },
        },
      )}
    </>
  )
})
