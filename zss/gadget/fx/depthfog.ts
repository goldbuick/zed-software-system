import { EffectProps, wrapEffect } from '@react-three/postprocessing'
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'

const depthfogfragshader = `
float qinticIn(float t) {
  return pow(t, 5.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
	float viewZ = perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
	float linearDepth = 1.0 - viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
  float moddedDepth = qinticIn(linearDepth);
  float shade = clamp(moddedDepth, 0.0, 1.0);
  outputColor = vec4(vec3(shade), inputColor.a);
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
