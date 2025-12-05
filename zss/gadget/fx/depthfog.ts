import { EffectProps, wrapEffect } from '@react-three/postprocessing'
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'

const depthfogfragshader = `
float exponentialIn(float t) {
  return t == 0.0 ? t : pow(2.0, 10.0 * (t - 1.0));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
	float viewZ = perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
	float linearDepth = 1.0 - viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
  float shade = clamp(exponentialIn(linearDepth) + 0.2, 0.0, 1.0);

  vec3 color = vec3(shade);
  outputColor = vec4(color, inputColor.a);
}
`

class DepthFogEffect extends Effect {
  constructor() {
    super('DepthFogEffect', depthfogfragshader, {
      blendFunction: BlendFunction.MULTIPLY,
      attributes: EffectAttribute.DEPTH,
    })
  }

  update(): void {}
}

export type DepthFogProps = EffectProps<typeof DepthFogEffect>

export const DepthFog = wrapEffect(DepthFogEffect)
