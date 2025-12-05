import { EffectProps, wrapEffect } from '@react-three/postprocessing'
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'

const depthfogfragshader = `
// adapted from https://www.shadertoy.com/view/Mlt3z8
float bayerDither2x2( vec2 v ) {
  return mod( 3.0 * v.y + 2.0 * v.x, 4.0 );
}

float bayerDither4x4( vec2 v ) {
  vec2 P1 = mod( v, 2.0 );
  vec2 P2 = mod( floor( 0.5  * v ), 2.0 );
  return 4.0 * bayerDither2x2( P1 ) + bayerDither2x2( P2 );
}

float exponentialIn(float t) {
  return t == 0.0 ? t : pow(2.0, 10.0 * (t - 1.0));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
	float viewZ = perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
	float linearDepth = 1.0 - viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
  float shade = exponentialIn(linearDepth) + 0.2;

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
