import { type Instance, useFrame, useThree } from '@react-three/fiber'
import { EffectComposerContext } from '@react-three/postprocessing'
import {
  Effect,
  EffectAttribute,
  EffectComposer as EffectComposerImpl,
  EffectPass,
  Pass,
  RenderPass,
} from 'postprocessing'
import {
  type JSX,
  forwardRef,
  memo,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import type { Camera, Group } from 'three'
import { HalfFloatType } from 'three'

export type EffectComposerProps = {
  children: JSX.Element | JSX.Element[]
  camera: Camera
  width: number
  height: number
}

const isConvolution = (effect: Effect): boolean =>
  (effect.getAttributes() & EffectAttribute.CONVOLUTION) ===
  EffectAttribute.CONVOLUTION

export const EffectComposer = /* @__PURE__ */ memo(
  /* @__PURE__ */ forwardRef<EffectComposerImpl, EffectComposerProps>(
    ({ children, camera, width, height }, ref) => {
      const { gl, scene } = useThree()

      const [composer] = useMemo(() => {
        // Initialize composer
        const effectComposer = new EffectComposerImpl(gl, {
          depthBuffer: true,
          stencilBuffer: false,
          multisampling: 0,
          frameBufferType: HalfFloatType,
        })
        effectComposer.autoRenderToScreen = false

        // Add render pass
        effectComposer.addPass(new RenderPass(scene, camera))

        return [effectComposer]
      }, [camera, gl, scene])

      useFrame((_, delta) => {
        const currentAutoClear = gl.autoClear
        gl.autoClear = true
        composer.setSize(width, height)
        composer.render(delta)
        gl.autoClear = currentAutoClear
      }, -1)

      const group = useRef<Group>(null!)
      useLayoutEffect(() => {
        const passes: Pass[] = []

        // TODO: rewrite all of this with R3F v9
        const groupInstance = (
          group.current as Group & { __r3f: Instance<Group> }
        ).__r3f

        if (groupInstance && composer) {
          const children = groupInstance.children

          for (let i = 0; i < children.length; i++) {
            const child = children[i].object

            if (child instanceof Effect) {
              const effects: Effect[] = [child]

              if (!isConvolution(child)) {
                let next: unknown = null
                while ((next = children[i + 1]?.object) instanceof Effect) {
                  if (isConvolution(next)) break
                  effects.push(next)
                  i++
                }
              }

              const pass = new EffectPass(camera, ...effects)
              passes.push(pass)
            } else if (child instanceof Pass) {
              passes.push(child)
            }
          }

          for (const pass of passes) composer?.addPass(pass)
        }

        return () => {
          for (const pass of passes) composer?.removePass(pass)
        }
      }, [composer, children, camera])

      // Memoize state, otherwise it would trigger all consumers on every render
      const state = useMemo(
        () => ({
          composer,
          normalPass: null,
          downSamplingPass: null,
          resolutionScale: undefined,
          camera,
          scene,
        }),
        [composer, camera, scene],
      )

      // Expose the composer
      useImperativeHandle(ref, () => composer, [composer])

      return (
        <EffectComposerContext.Provider value={state}>
          <group ref={group}>{children}</group>
        </EffectComposerContext.Provider>
      )
    },
  ),
)
