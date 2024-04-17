import { EffectProps, wrapEffect } from '@react-three/postprocessing'
import { BlendFunction, Effect } from 'postprocessing'
import { Texture, Uniform, WebGLRenderTarget, WebGLRenderer } from 'three'

const CRTShapeFragmentShader = `
void mainUv(inout vec2 uv) {
  float distortion = 0.014;
	vec2 xn = 2.0 * (uv.st - 0.5);
	vec3 xDistorted = vec3((1.0 + vec2(distortion, distortion) * dot(xn, xn)) * xn, 1.0);

	mat3 kk = mat3(
		vec3(1.0, 0.0, 0.0),
		vec3(0.0, 1.0, 0.0),
		vec3(0.0, 0.0, 1.0)
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
uniform float shifty;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float distortion = -0.014;
	vec2 xn = 2.0 * (uv.st - 0.5);
	vec3 xDistorted = vec3((1.0 + vec2(distortion, distortion) * dot(xn, xn)) * xn, 1.0);

	mat3 kk = mat3(
		vec3(1.0, 0.0, 0.0),
		vec3(0.0, 1.0, 0.0),
		vec3(0.0, 0.0, 1.0)
	);

	vec2 bend = (kk * xDistorted).xy * 0.5 + 0.5;
	float offset = time + bend.y * count;
  float signal = sin(shifty + offset) + 0.3;

	// outputColor = vec4(signal, signal, signal, inputColor.a);
	outputColor = mix(vec4(signal, signal, signal, inputColor.a), inputColor, 0.725);
}
`

class CRTLinesEffect extends Effect {
  constructor(blendFunction: BlendFunction) {
    super('CRTLinesEffect', CRTLinesFragmentShader, {
      blendFunction,
      uniforms: new Map([['count', new Uniform(1)]]),
    })
  }

  update(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget<Texture>,
  ): void {
    const count = this.uniforms.get('count')
    if (count) {
      count.value = inputBuffer.height * (Math.PI * 0.5)
    }
  }
}

export type CRTLinesProps = EffectProps<typeof CRTLinesEffect>
export const CRTLines = wrapEffect(CRTLinesEffect)
