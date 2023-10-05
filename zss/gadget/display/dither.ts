import * as THREE from 'three'

import { cloneMaterial, interval, time } from './anim'

export function updateDitherDataTexture(
  texture: THREE.DataTexture,
  width: number,
  height: number,
  alpha: number[],
) {
  const size = width * height * 4
  for (let i = 0, t = 0; i < size; ++t) {
    // alpha, skip, skip, skip
    texture.image.data[i++] = alpha[t] * 255
    i += 3
  }
  texture.needsUpdate = true
  return texture
}

export function createDitherDataTexture(
  width: number,
  height: number,
  alpha: number[],
) {
  const data = new Uint8Array(4 * width * height)
  const texture = new THREE.DataTexture(data, width, height)
  return updateDitherDataTexture(texture, width, height, alpha)
}

const ditherMaterial = new THREE.ShaderMaterial({
  // settings
  transparent: false,
  uniforms: {
    time,
    interval,
    data: { value: null },
  },
  // vertex shader
  vertexShader: `
      #include <clipping_planes_pars_vertex>
  
      varying vec2 vUv;
    
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        vUv = uv;
        
        #include <clipping_planes_vertex>
      }
    `,
  // fragment shader
  fragmentShader: `
      #include <clipping_planes_pars_fragment>
  
      uniform float time;
      uniform float interval;
      uniform sampler2D data;
  
      varying vec2 vUv;

      // adapted from https://www.shadertoy.com/view/Mlt3z8
      float bayerDither2x2( vec2 v ) {
        return mod( 3.0 * v.y + 2.0 * v.x, 4.0 );
      }

      float bayerDither4x4( vec2 v ) {
        vec2 P1 = mod( v, 2.0 );
        vec2 P2 = mod( floor( 0.5  * v ), 2.0 );
        return 4.0 * bayerDither2x2( P1 ) + bayerDither2x2( P2 );
      }

      void main() {
        #include <clipping_planes_fragment>
  
        float alpha = texture2D(data, vUv).r;
        if (alpha < 1.0) {
          vec2 ditherCoord = floor( mod( gl_FragCoord.xy, 4.0 ) );
          if ( bayerDither4x4( ditherCoord ) / 16.0 >= alpha ) {
            discard;
          }
        }

        gl_FragColor.rgba = vec4(0.0, 0.0, 0.0, 1.0);
      }
    `,
})

export function createDitherMaterial() {
  return cloneMaterial(ditherMaterial)
}
