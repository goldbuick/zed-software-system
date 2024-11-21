// import { EffectProps, wrapEffect } from '@react-three/postprocessing'
import {
  BlendFunction,
  Effect,
  EffectAttribute,
  ColorChannel,
} from 'postprocessing'
import { Texture, Uniform, UnsignedByteType } from 'three'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { halftonefragshader } from './halftone'
import { type ReactThreeFiber, extend, useThree } from '@react-three/fiber'
import { forwardRef, useMemo } from 'react'

const crtshapevertshader = `
#ifdef ASPECT_CORRECTION
	uniform float scale;
#else
	uniform mat3 uvTransform;
#endif

varying vec2 vUv2;

void mainSupport(const in vec2 uv) {
	#ifdef ASPECT_CORRECTION
		vUv2 = uv * vec2(aspect, 1.0) * scale;
	#else
		vUv2 = (uvTransform * vec3(uv, 1.0)).xy;
	#endif
}
`

const crtshapefragshader = `
uniform float viewheight;
uniform sampler2D splat;

${halftonefragshader}

float rectdistance(vec2 uv) {
  vec2 tl = vec2(-1.0);
  vec2 br = vec2(1.0);
  vec2 d = max(tl - uv, uv - br);
  return abs(length(max(vec2(0.0), d)) + min(0.0, max(d.x, d.y)));
}

vec2 bendy(const in vec2 xn) {
  float distortion = 0.511;
  float scale = 0.7;
  // float distortion = 0.0173;
  vec3 xDistorted = vec3((1.0 + vec2(distortion, distortion) * dot(xn, xn)) * xn, 1.0);

  mat3 kk = mat3(
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0)
  );

  return (kk * xDistorted).xy * scale;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
	#ifdef UV_TRANSFORM
		vec4 texel = texture2D(splat, vUv2);
	#else
		vec4 texel = texture2D(splat, uv);
	#endif

  vec2 xn = 2.0 * (uv.st - 0.5);
  vec2 edge = bendy(xn);
  vec2 bent = edge.xy * 0.5 + 0.5;
  
  float dx = rectdistance(xn);
  float bx = rectdistance(edge);

  // apply shape
  float doot = max(abs(edge.x), abs(edge.y));
  if (doot < 1.0) {
    // display
    vec4 displaycolor = texture2D(inputBuffer, bent);
    vec4 fuxtcolor = texel;
    // outputColor = mix(displaycolor, fuxtcolor, 0.1);
    outputColor = displaycolor + (fuxtcolor * 0.09);
    // apply halftones
    outputColor.rgb = halftone(outputColor.rgb, uv.st);

  } else if (doot > 1.004) {
    // display shell
    // rbgb 205 205 193
    vec3 matte = vec3(205.0 / 255.0, 205.0 / 255.0, 193.0 / 255.0);
    vec3 dkmatte = mix(matte, vec3(0.0), 0.25);
    float mx = pow(1.0 - bx, 16.0) + 0.2;
    outputColor = vec4(mix(matte, dkmatte, mx), inputColor.a);

  } else {
    // border
    outputColor = vec4(mix(vec3(0.0), outputColor.rgb, 0.5), inputColor.a);
  }

  // apply inner shade && scanlines
  if (doot >= 0.5 && doot < 1.0) {
    float sh = clamp(0.0, 1.0, 1.0 - bx - 0.7);
    vec3 shade = mix(outputColor.rgb, vec3(0.0), pow(sh, 4.0));
    outputColor = vec4(shade, inputColor.a);
  }

  // apply outer shade
  if (doot >= 0.97) {
    float sh = clamp(0.0, 1.0, bx * 24.0);
    vec3 dkout = mix(vec3(0.0), outputColor.rgb, 0.81);
    vec3 shade = mix(dkout, outputColor.rgb, sh);
    outputColor = vec4(shade, inputColor.a);
  }
}
`

type CRTShapeOpts = {
  splat?: Texture
  viewheight?: number
}

class CRTShapeEffect extends Effect {
  constructor({ splat, viewheight }: CRTShapeOpts = {}) {
    super('CRTShapeEffect', crtshapefragshader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      defines: new Map([
        ['TEXEL', 'texel'],
        ['TEXTURE_PRECISION_HIGH', '1'],
      ]),
      uniforms: new Map<string, Uniform>([
        ['splat', new Uniform(splat)],
        ['viewheight', new Uniform(viewheight ?? 128)],
      ]),
    })
  }

  get splat(): MAYBE<Texture> {
    return this.uniforms.get('splat')?.value
  }

  set splat(value: Texture) {
    const { splat: prevTexture, uniforms, defines } = this
    const uniformmap = uniforms.get('splat')
    const uniformuvTransform = uniforms.get('uvTransform')

    if (prevTexture !== value && uniformmap && uniformuvTransform) {
      uniformmap.value = value
      uniformuvTransform.value = value.matrix
      defines.delete('TEXTURE_PRECISION_HIGH')

      if (value !== null) {
        if (value.matrixAutoUpdate) {
          defines.set('UV_TRANSFORM', '1')
          this.setVertexShader(crtshapevertshader)
        } else {
          defines.delete('UV_TRANSFORM')
          this.setVertexShader(null as any)
        }

        if (value.type !== UnsignedByteType) {
          defines.set('TEXTURE_PRECISION_HIGH', '1')
        }

        if (prevTexture === null || prevTexture?.type !== value.type) {
          this.setChanged()
        }
      }
    }
  }

  getTexture() {
    return this.splat
  }

  setTexture(value: Texture) {
    this.splat = value
  }

  get aspectCorrection() {
    return this.defines.has('ASPECT_CORRECTION')
  }

  set aspectCorrection(value) {
    if (this.aspectCorrection !== value) {
      if (value) {
        this.defines.set('ASPECT_CORRECTION', '1')
      } else {
        this.defines.delete('ASPECT_CORRECTION')
      }

      this.setChanged()
    }
  }

  get uvTransform() {
    const splat = this.splat
    return !!splat?.matrixAutoUpdate
  }

  set uvTransform(value: boolean) {
    const splat = this.splat

    if (ispresent(splat)) {
      splat.matrixAutoUpdate = value
    }
  }

  setTextureSwizzleRGBA(r: number, g = r, b = r, a = r) {
    const rgba = 'rgba'
    let swizzle = ''

    if (
      r !== ColorChannel.RED ||
      g !== ColorChannel.GREEN ||
      b !== ColorChannel.BLUE ||
      a !== ColorChannel.ALPHA
    ) {
      swizzle = ['.', rgba[r], rgba[g], rgba[b], rgba[a]].join('')
    }

    this.defines.set('TEXEL', 'texel' + swizzle)
    this.setChanged()
  }

  update(): void {
    if (this.splat?.matrixAutoUpdate) {
      this.splat.updateMatrix()
    }
  }
}

type EffectConstructor = new (...args: any[]) => Effect

type EffectProps<T extends EffectConstructor> = ReactThreeFiber.Node<
  T extends Function ? T['prototype'] : InstanceType<T>,
  T
> &
  ConstructorParameters<T>[0] & {
    blendFunction?: BlendFunction
    opacity?: number
  }

export type CRTShapeProps = EffectProps<typeof CRTShapeEffect>

let i = 0
const components = new WeakMap<EffectConstructor, React.ExoticComponent<any> | string>()

const wrapEffect = <T extends EffectConstructor>(effect: T, defaults?: EffectProps<T>) =>
  /* @__PURE__ */ forwardRef<T, EffectProps<T>>(function Effect(
    { blendFunction = defaults?.blendFunction, opacity = defaults?.opacity, ...props },
    ref
  ) {
    let Component = components.get(effect)
    if (!Component) {
      const key = `@react-three/postprocessing/${effect.name}-${i++}`
      extend({ [key]: effect })
      components.set(effect, (Component = key))
    }

    const camera = useThree((state) => state.camera)
    const args = useMemo(
      () => [...((defaults?.args ?? []) as any[]), ...((props.args ?? [{ ...defaults, ...props }]) as any[])],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [JSON.stringify(props)]
    )

    return (
      <Component
        camera={camera}
        blendMode-blendFunction={blendFunction}
        blendMode-opacity-value={opacity}
        {...props}
        ref={ref}
        args={args}
      />
    )
  })
  
export const CRTShape = wrapEffect(CRTShapeEffect)
