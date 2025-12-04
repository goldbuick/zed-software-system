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

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // float alpha = 0.0 ; // depth * 0.0001;

  // vec2 ditherCoord = floor(mod(uv, 4.0));
  // if (bayerDither4x4(ditherCoord) / 16.0 >= alpha) {
  //   outputColor = inputColor;
  // } else {
  //   outputColor = vec4(0.0, 0.0, 0.0, 1.0);
  // }

  vec3 color = vec3(depth * 3.0);
  outputColor = vec4(color, inputColor.a);
}
`

class DepthFogEffect extends Effect {
  constructor() {
    super('DepthFogEffect', depthfogfragshader, {
      blendFunction: BlendFunction.HARD_LIGHT,
      attributes: EffectAttribute.DEPTH,
    })
  }

  update(): void {}
}

export type DepthFogProps = EffectProps<typeof DepthFogEffect>

export const DepthFog = wrapEffect(DepthFogEffect)
