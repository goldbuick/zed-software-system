import { EffectProps, wrapEffect } from '@react-three/postprocessing'
import { BlendFunction, Effect } from 'postprocessing'
import { Texture, Uniform, WebGLRenderTarget, WebGLRenderer } from 'three'

const CRTShapeFragmentShader = `
void mainUv(inout vec2 uv) {
  vec2 distortion = vec2(0.014, 0.014);
  vec2 principalPoint = vec2(0.0, 0.0);
  vec2 focalLength = vec2(0.99, 0.99);
  float skew = 0.0;
	vec2 xn = 2.0 * (uv.st - 0.5); // [-1, 1]
	vec3 xDistorted = vec3((1.0 + distortion * dot(xn, xn)) * xn, 1.0);

	mat3 kk = mat3(
		vec3(focalLength.x, 0.0, 0.0),
		vec3(skew * focalLength.x, focalLength.y, 0.0),
		vec3(principalPoint.x, principalPoint.y, 1.0)
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
	float y = uv.y;
	vec2 sl = vec2(sin(y * count), cos(y * count));
	vec3 mixedColor = mix(sl.rrr, inputColor.rgb, 0.83);
	outputColor = vec4(mixedColor, inputColor.a);
}
`

class CRTLinesEffect extends Effect {
  constructor() {
    super('CRTLinesEffect', CRTLinesFragmentShader, {
      blendFunction: BlendFunction.OVERLAY,
      uniforms: new Map([['count', new Uniform(1)]]),
    })
  }

  update(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget<Texture>,
  ): void {
    this.uniforms.get('count').value = inputBuffer.height * 1.5
  }
}

export type CRTLinesProps = EffectProps<typeof CRTLinesEffect>
export const CRTLines = wrapEffect(CRTLinesEffect)
