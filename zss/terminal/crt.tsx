import { EffectProps, wrapEffect } from '@react-three/postprocessing'
import { BlendFunction, Effect } from 'postprocessing'
import { Texture, Uniform, WebGLRenderTarget, WebGLRenderer } from 'three'

const CRTShapeFragmentShader = `
void mainUv(inout vec2 uv) {
  float distortion = 0.015;
  float principalPoint = 0.0;
  float focalLength = 0.99;
	vec2 xn = 2.0 * (uv.st - 0.5); // [-1, 1]
	vec3 xDistorted = vec3((1.0 + vec2(distortion, distortion) * dot(xn, xn)) * xn, 1.0);

	mat3 kk = mat3(
		vec3(focalLength, 0.0, 0.0),
		vec3(0.0, focalLength, 0.0),
		vec3(principalPoint, principalPoint, 1.0)
	);

	uv = (kk * xDistorted).xy * 0.5 + 0.5;
}
`

class CRTShapeEffect extends Effect {
  constructor() {
    super('CRTShapeEffect', CRTShapeFragmentShader, {})
  }
}

export type CRTShapeProps = EffectProps<typeof CRTShapeEffect>
export const CRTShape = wrapEffect(CRTShapeEffect)

const CRTLinesFragmentShader = `
uniform float count;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float distortion = -0.015;
  float principalPoint = 0.0;
  float focalLength = 1.0;
	vec2 xn = 2.0 * (uv.st - 0.5); // [-1, 1]
	vec3 xDistorted = vec3((1.0 + vec2(distortion, distortion) * dot(xn, xn)) * xn, 1.0);

	mat3 kk = mat3(
		vec3(focalLength, 0.0, 0.0),
		vec3(0.0, focalLength, 0.0),
		vec3(principalPoint, principalPoint, 1.0)
	);

	vec2 vrrr = (kk * xDistorted).xy * 0.5 + 0.5;
  float signal = (vrrr.y + time * 0.0001) * count * 2.0;  
  float tweak = smoothstep(0.0, 1.0, (floor((signal / 2.0 - 0.5) / -1.0) + floor(signal / 2.0)) + 1.0);

	vec3 mixedColor = mix(vec3(tweak, tweak, tweak), inputColor.rgb, 0.0000125);
	outputColor = vec4(mixedColor, inputColor.a);
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
