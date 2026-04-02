import { type Instance, useFrame, useStore, useThree } from '@react-three/fiber'
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
import {
  canvassyncgeneration,
  forcer3fglresize,
} from 'zss/gadget/canvasrelayout'

const isConvolution = (effect: Effect): boolean =>
  (effect.getAttributes() & EffectAttribute.CONVOLUTION) ===
  EffectAttribute.CONVOLUTION

export type EffectComposerProps = {
  children: JSX.Element | JSX.Element[]
  camera?: Camera
  width: number
  height: number
  clearBeforeRender?: boolean
}

type EffectComposerInternalProps = EffectComposerProps & {
  camera: Camera
  clearBeforeRender: boolean
}

const EffectComposerInternal = memo(
  forwardRef<EffectComposerImpl, EffectComposerInternalProps>(
    ({ children, camera, width, height, clearBeforeRender }, ref) => {
      const store = useStore()
      const { gl, scene, viewport } = useThree()
      const lastsize = useRef({ w: NaN, h: NaN, dpr: NaN })
      const lastcanvassyncgen = useRef(canvassyncgeneration)

      useLayoutEffect(() => {
        forcer3fglresize(store)
      }, [store])

      const [composer] = useMemo(() => {
        const effectComposer = new EffectComposerImpl(gl, {
          depthBuffer: true,
          stencilBuffer: false,
          multisampling: 0,
          frameBufferType: HalfFloatType,
        })
        if (!clearBeforeRender) {
          effectComposer.autoRenderToScreen = false
        }
        effectComposer.addPass(new RenderPass(scene, camera))
        return [effectComposer]
      }, [camera, gl, scene, clearBeforeRender])

      useFrame(
        (_, delta) => {
          const dpr = viewport.dpr
          if (lastcanvassyncgen.current !== canvassyncgeneration) {
            lastcanvassyncgen.current = canvassyncgeneration
            lastsize.current = { w: NaN, h: NaN, dpr: NaN }
          }
          if (
            lastsize.current.w !== width ||
            lastsize.current.h !== height ||
            lastsize.current.dpr !== dpr
          ) {
            lastsize.current = { w: width, h: height, dpr }
            composer.setSize(width, height)
          }
          if (clearBeforeRender) {
            const currentAutoClear = gl.autoClear
            gl.autoClear = true
            composer.render(delta)
            gl.autoClear = currentAutoClear
          } else {
            composer.render(delta)
          }
        },
        clearBeforeRender ? 2 : 1,
      )

      const group = useRef<Group>(null!)
      useLayoutEffect(() => {
        const passes: Pass[] = []
        const groupInstance = (
          group.current as Group & { __r3f: Instance<Group> }
        ).__r3f

        if (groupInstance && composer) {
          const groupchildren = groupInstance.children
          for (let i = 0; i < groupchildren.length; i++) {
            const child = groupchildren[i].object
            if (child instanceof Effect) {
              const effects: Effect[] = [child]
              if (!isConvolution(child)) {
                let next: unknown = null
                while (
                  (next = groupchildren[i + 1]?.object) instanceof Effect
                ) {
                  if (isConvolution(next)) {
                    break
                  }
                  effects.push(next)
                  i++
                }
              }
              passes.push(new EffectPass(camera, ...effects))
            } else if (child instanceof Pass) {
              passes.push(child)
            }
          }
          for (const pass of passes) {
            composer.addPass(pass)
          }
        }
        return () => {
          for (const pass of passes) {
            composer?.removePass(pass)
          }
        }
      }, [composer, children, camera])

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

      useImperativeHandle(ref, () => composer, [composer])

      return (
        <EffectComposerContext.Provider value={state}>
          <group ref={group}>{children}</group>
        </EffectComposerContext.Provider>
      )
    },
  ),
)

export type EffectComposerWithCameraProps = {
  children: JSX.Element | JSX.Element[]
  camera: Camera
  width: number
  height: number
}

export const EffectComposer = /* @__PURE__ */ memo(
  forwardRef<EffectComposerImpl, EffectComposerWithCameraProps>(
    (props, ref) => (
      <EffectComposerInternal {...props} ref={ref} clearBeforeRender={false} />
    ),
  ),
)

export type EffectComposerMainProps = {
  children: JSX.Element | JSX.Element[]
  width: number
  height: number
}

export const EffectComposerMain = /* @__PURE__ */ memo(
  forwardRef<EffectComposerImpl, EffectComposerMainProps>((props, ref) => {
    const { camera } = useThree()
    return (
      <EffectComposerInternal
        {...props}
        camera={camera}
        ref={ref}
        clearBeforeRender
      />
    )
  }),
)
