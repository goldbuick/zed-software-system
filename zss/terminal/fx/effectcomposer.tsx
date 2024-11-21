import type { Camera, Scene } from 'three'
import { HalfFloatType, NoToneMapping } from 'three'
import React, {
  forwardRef,
  useMemo,
  useEffect,
  useLayoutEffect,
  createContext,
  useRef,
  useImperativeHandle,
} from 'react'
import { useThree, useFrame, useInstanceHandle } from '@react-three/fiber'
import {
  EffectComposer as EffectComposerImpl,
  RenderPass,
  EffectPass,
  NormalPass,
  // @ts-ignore
  DepthDownsamplingPass,
  Effect,
  Pass,
  EffectAttribute,
} from 'postprocessing'

export const EffectComposerContext = createContext<{
  composer: EffectComposerImpl
  normalPass: NormalPass | null
  downSamplingPass: DepthDownsamplingPass | null
  camera: Camera
  scene: Scene
  resolutionScale?: number
}>(null!)

export type EffectComposerProps = {  
  children: JSX.Element | JSX.Element[]
}

const isConvolution = (effect: Effect): boolean =>
  (effect.getAttributes() & EffectAttribute.CONVOLUTION) === EffectAttribute.CONVOLUTION

export const EffectComposer = React.memo(
  forwardRef(
    (
      { children }: EffectComposerProps,
      ref 
    ) => {
      const { gl, scene: defaultScene, camera: defaultCamera, size } = useThree()
      const scene = defaultScene
      const camera = defaultCamera

      const [composer, normalPass, downSamplingPass] = useMemo(() => {
        // Initialize composer
        const effectComposer = new EffectComposerImpl(gl, {
          depthBuffer: false,
          stencilBuffer: false,
          frameBufferType: HalfFloatType,
          multisampling: 0,
        })

        // Add render pass
        effectComposer.addPass(new RenderPass(scene, camera))

        // Create normal pass
        let downSamplingPass = null
        let normalPass = null

        return [effectComposer, normalPass, downSamplingPass]
      }, [
        camera,
        gl,
        scene,
      ])

      useEffect(() => composer?.setSize(size.width, size.height), [composer, size])
      useFrame(
        (_, delta) => {
            const currentAutoClear = gl.autoClear
            gl.autoClear = true
            composer.render(delta)
            gl.autoClear = currentAutoClear
        },
        1
      )

      const group = useRef(null)
      const instance = useInstanceHandle(group)
      useLayoutEffect(() => {
        const passes: Pass[] = []

        if (group.current && instance.current && composer) {
          const children = instance.current.objects as unknown[]

          for (let i = 0; i < children.length; i++) {
            const child = children[i]

            if (child instanceof Effect) {
              const effects: Effect[] = [child]

              if (!isConvolution(child)) {
                let next: unknown = null
                while ((next = children[i + 1]) instanceof Effect) {
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
      }, [composer, children, camera, normalPass, downSamplingPass, instance])

      // Disable tone mapping because threejs disallows tonemapping on render targets
      useEffect(() => {
        const currentTonemapping = gl.toneMapping
        gl.toneMapping = NoToneMapping
        return () => {
          gl.toneMapping = currentTonemapping
        }
      }, [])

      // Memoize state, otherwise it would trigger all consumers on every render
      const state = useMemo(
        () => ({ composer, normalPass, downSamplingPass, camera, scene }),
        [composer, normalPass, downSamplingPass, camera, scene]
      )

      // Expose the composer
      useImperativeHandle(ref, () => composer, [composer])

      return (
        <EffectComposerContext.Provider value={state}>
          <group ref={group}>{children}</group>
        </EffectComposerContext.Provider>
      )
    }
  )
)