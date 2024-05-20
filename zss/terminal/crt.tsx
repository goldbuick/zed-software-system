import { EffectProps, wrapEffect } from '@react-three/postprocessing'
import {
  BlendFunction,
  Effect,
  EffectAttribute,
  ColorChannel,
} from 'postprocessing'
import {
  Texture,
  Uniform,
  UnsignedByteType,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import { MAYBE, ispresent } from 'zss/mapping/types'

const CRTShapeVertShader = `
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

const CRTShapeFragShader = `
// #ifdef TEXTURE_PRECISION_HIGH
// 	uniform highp sampler2D splat;
// #else
// 	uniform mediump sampler2D splat;
// #endif

uniform sampler2D splat;

float rectdistance(vec2 uv) {
  vec2 tl = vec2(-1.0);
  vec2 br = vec2(1.0);
  vec2 d = max(tl - uv, uv - br);
  return abs(length(max(vec2(0.0), d)) + min(0.0, max(d.x, d.y)));
}

vec2 bendy(const in vec2 xn) {
  float distortion = 0.0137;
  vec3 xDistorted = vec3((1.0 + vec2(distortion, distortion) * dot(xn, xn)) * xn, 1.0);

  mat3 kk = mat3(
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0)
  );

  return (kk * xDistorted).xy;
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
    outputColor = mix(displaycolor, fuxtcolor, 0.04);
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

  // apply inner shade
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
  texture?: Texture
}

class CRTShapeEffect extends Effect {
  constructor({ texture }: CRTShapeOpts = {}) {
    super('CRTShapeEffect', CRTShapeFragShader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      defines: new Map([
        ['TEXEL', 'texel'],
        ['TEXTURE_PRECISION_HIGH', '1'],
      ]),
      uniforms: new Map<string, Uniform>([['splat', new Uniform(texture)]]),
    })
  }

  get texture(): MAYBE<Texture> {
    return this.uniforms.get('splat')?.value
  }

  set texture(value: Texture) {
    const { texture: prevTexture, uniforms, defines } = this
    const uniformmap = uniforms.get('splat')
    const uniformuvTransform = uniforms.get('uvTransform')

    if (prevTexture !== value && uniformmap && uniformuvTransform) {
      uniformmap.value = value
      uniformuvTransform.value = value.matrix
      defines.delete('TEXTURE_PRECISION_HIGH')

      if (value !== null) {
        if (value.matrixAutoUpdate) {
          defines.set('UV_TRANSFORM', '1')
          this.setVertexShader(CRTShapeVertShader)
        } else {
          defines.delete('UV_TRANSFORM')
          this.setVertexShader(null as any)
        }

        if (value.type !== UnsignedByteType) {
          defines.set('TEXTURE_PRECISION_HIGH', '1')
        }

        if (
          prevTexture === null ||
          prevTexture?.type !== value.type ||
          prevTexture?.encoding !== value.encoding
        ) {
          this.setChanged()
        }
      }
    }
  }

  getTexture() {
    return this.texture
  }

  setTexture(value: Texture) {
    this.texture = value
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
    const texture = this.texture
    return !!texture?.matrixAutoUpdate
  }

  set uvTransform(value: boolean) {
    const texture = this.texture

    if (ispresent(texture)) {
      texture.matrixAutoUpdate = value
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
    if (this.texture?.matrixAutoUpdate) {
      this.texture.updateMatrix()
    }
  }
}

export type CRTShapeProps = EffectProps<typeof CRTShapeEffect>
export const CRTShape = wrapEffect(CRTShapeEffect)

const CRTLinesFragShader = `
uniform float viewheight;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float rate1 = 0.002;
  float stab1 = 1.5;
  float fuzz1 = 1.35;
  float cycle1 = (uv.y + time * rate1) * viewheight * fuzz1;
  float signal1 = sin(cycle1) + stab1;

  float rate2 = 0.2;
  float scale2 = 0.01;
  float stab2 = 1.99;
  float cycle2 = (uv.y * viewheight * scale2) - time * rate2;
  float signal2 = sin(cycle2) + stab2;

  float shade = smoothstep(0.0, 1.0, signal1);
  float light = 1.0 - (smoothstep(0.0, 1.0, pow(signal2, 128.0)));

  vec3 c = mix(vec3(0.0), vec3(1.0), smoothstep(0.0, 1.0, shade + light * 0.25));
  
	outputColor = vec4(c, inputColor.a);
}
`

type CRTLinesOpts = {
  viewheight?: number
}

class CRTLinesEffect extends Effect {
  // eslint-disable-next-line no-empty-pattern
  constructor({ viewheight }: CRTLinesOpts = {}) {
    super('CRTLinesEffect', CRTLinesFragShader, {
      blendFunction: BlendFunction.MULTIPLY,
      uniforms: new Map<string, Uniform>([
        ['viewheight', new Uniform(viewheight ?? 128)],
      ]),
    })
  }

  // update(
  //   _renderer: WebGLRenderer,
  //   inputBuffer: WebGLRenderTarget<Texture>,
  // ): void {
  //   const viewheight = this.uniforms.get('viewheight')
  //   if (viewheight) {
  //     viewheight.value = inputBuffer.height
  //   }
  // }
}

export type CRTLinesProps = EffectProps<typeof CRTLinesEffect>
export const CRTLines = wrapEffect(CRTLinesEffect)
