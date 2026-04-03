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

function syncdetachedcomposerbuffers(
  composer: EffectComposerImpl,
  width: number,
  height: number,
  dpr: number,
) {
  const bw = Math.round(width * dpr)
  const bh = Math.round(height * dpr)
  composer.inputBuffer.setSize(bw, bh)
  composer.outputBuffer.setSize(bw, bh)
  for (let i = 0; i < composer.passes.length; i++) {
    composer.passes[i].setSize(bw, bh)
  }
}

export type EffectComposerProps = {
  children: JSX.Element | JSX.Element[]
  camera?: Camera
  width: number
  height: number
  clearBeforeRender?: boolean
  /**
   * When true, resize composer RTs to `width × height` in **device pixels** (`logical * dpr *
   * dprscale`) without calling `renderer.setSize`, so the main canvas size is unchanged. Use
   * inside board RenderTexture portals so FBO aspect matches the ortho frustum (fixes pick drift).
   */
  detachedbuffersize?: boolean
  /** Multiplier on `viewport.dpr` for buffer allocation (must match RenderLayer `dprscale`). */
  dprscale?: number
}

type EffectComposerInternalProps = EffectComposerProps & {
  camera: Camera
  clearBeforeRender: boolean
}

const EffectComposerInternal = memo(
  forwardRef<EffectComposerImpl, EffectComposerInternalProps>(
    (
      {
        children,
        camera,
        width,
        height,
        clearBeforeRender,
        detachedbuffersize = false,
        dprscale = 1,
      },
      ref,
    ) => {
      const store = useStore()
      const { gl, scene, viewport } = useThree()
      const lastsize = useRef({
        w: NaN,
        h: NaN,
        dpr: NaN,
        dprs: NaN,
        pc: NaN,
      })
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
          const dpr = viewport.dpr * dprscale
          if (lastcanvassyncgen.current !== canvassyncgeneration) {
            lastcanvassyncgen.current = canvassyncgeneration
            lastsize.current = {
              w: NaN,
              h: NaN,
              dpr: NaN,
              dprs: NaN,
              pc: NaN,
            }
          }
          if (detachedbuffersize) {
            const bw = Math.round(width * dpr)
            const bh = Math.round(height * dpr)
            const passcount = composer.passes.length
            const bufmismatch =
              composer.inputBuffer.width !== bw ||
              composer.inputBuffer.height !== bh
            if (
              lastsize.current.w !== width ||
              lastsize.current.h !== height ||
              lastsize.current.dpr !== dpr ||
              lastsize.current.dprs !== dprscale ||
              lastsize.current.pc !== passcount ||
              bufmismatch
            ) {
              lastsize.current = {
                w: width,
                h: height,
                dpr,
                dprs: dprscale,
                pc: passcount,
              }
              syncdetachedcomposerbuffers(composer, width, height, dpr)
            }
          } else if (
            lastsize.current.w !== width ||
            lastsize.current.h !== height ||
            lastsize.current.dpr !== dpr
          ) {
            lastsize.current = {
              w: width,
              h: height,
              dpr,
              dprs: dprscale,
              pc: lastsize.current.pc,
            }
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

      useLayoutEffect(() => {
        if (!detachedbuffersize || !composer) {
          return
        }
        const dpr = viewport.dpr * dprscale
        syncdetachedcomposerbuffers(composer, width, height, dpr)
        lastsize.current = {
          w: width,
          h: height,
          dpr,
          dprs: dprscale,
          pc: composer.passes.length,
        }
      }, [
        detachedbuffersize,
        composer,
        children,
        camera,
        width,
        height,
        viewport.dpr,
        dprscale,
      ])

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
  detachedbuffersize?: boolean
  dprscale?: number
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
