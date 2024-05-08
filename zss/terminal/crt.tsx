import { EffectProps, wrapEffect } from '@react-three/postprocessing'
import {
  BlendFunction,
  Effect,
  EffectAttribute,
  TextureEffect,
} from 'postprocessing'
import { Texture, Uniform, WebGLRenderTarget, WebGLRenderer } from 'three'

const CRTShapeFragmentShader = `
float rectdistance(vec2 uv) {
  vec2 tl = vec2(-1.0);
  vec2 br = vec2(1.0);
  vec2 d = max(tl - uv, uv - br);
  return abs(length(max(vec2(0.0), d)) + min(0.0, max(d.x, d.y)));
}

vec2 bendy(const in vec2 xn) {
  float distortion = 0.021;
  vec3 xDistorted = vec3((1.0 + vec2(distortion, distortion) * dot(xn, xn)) * xn, 1.0);

  mat3 kk = mat3(
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0)
  );

  return (kk * xDistorted).xy;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 xn = 2.0 * (uv.st - 0.5);
  vec2 edge = bendy(xn);
  vec2 bent = edge.xy * 0.5 + 0.5;
  
  float dx = rectdistance(xn);
  float bx = rectdistance(edge);

  // apply shape
  float doot = max(abs(edge.x), abs(edge.y));
  if (doot > 1.0) {
    vec3 matte = vec3(205.0 / 255.0, 205.0 / 255.0, 193.0 / 255.0);
    vec3 dkmatte = mix(matte, vec3(0.0), 0.25);
    float mx = pow(1.0 - bx, 16.0) + 0.2;
    outputColor = vec4(mix(matte, dkmatte, mx), inputColor.a);
  } else if (doot >= 1.0) {
    outputColor = vec4(vec3(0.0), inputColor.a);
  } else {  
    outputColor = texture2D(inputBuffer, bent);
    // apply inner shade
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
// 205	205	193
class CRTShapeEffect extends Effect {
  constructor() {
    super('CRTShapeEffect', CRTShapeFragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
    })
  }
}

export type CRTShapeProps = EffectProps<typeof CRTShapeEffect>
export const CRTShape = wrapEffect(CRTShapeEffect)

const CRTLinesFragmentShader = `
uniform float count;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float rate1 = 0.002;
  float stab1 = 1.5;
  float fuzz1 = 1.35;
  float cycle1 = (uv.y + time * rate1) * count * fuzz1;
  float signal1 = sin(cycle1) + stab1;

  float rate2 = 0.2;
  float scale2 = 0.01;
  float stab2 = 1.99;
  float cycle2 = (uv.y * count * scale2) - time * rate2;
  float signal2 = sin(cycle2) + stab2;

  float shade = smoothstep(0.0, 1.0, signal1);
  float light = 1.0 - (smoothstep(0.0, 1.0, pow(signal2, 128.0)));

  vec3 c = mix(vec3(0.0), vec3(1.0), smoothstep(0.0, 1.0, shade + light * 0.25));
  
	outputColor = vec4(c, inputColor.a);
}
`

class CRTLinesEffect extends Effect {
  constructor() {
    super('CRTLinesEffect', CRTLinesFragmentShader, {
      blendFunction: BlendFunction.MULTIPLY,
      uniforms: new Map([['count', new Uniform(1)]]),
    })
  }

  update(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget<Texture>,
  ): void {
    const count = this.uniforms.get('count')
    if (count) {
      count.value = inputBuffer.height
    }
  }
}

export type CRTLinesProps = EffectProps<typeof CRTLinesEffect>
export const CRTLines = wrapEffect(CRTLinesEffect)

export type TextureSplatProps = EffectProps<typeof TextureEffect>
export const TextureSplat = wrapEffect(TextureEffect)
