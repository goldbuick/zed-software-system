import { Color, DataTexture, DoubleSide, ShaderMaterial, Uniform } from 'three'
import { TICK_FPS } from 'zss/mapping/tick'

import { cloneMaterial, time } from './anim'

export function updateDitherDataTexture(
  texture: DataTexture,
  width: number,
  height: number,
  alpha: number[],
) {
  const size = width * height * 4
  for (let i = 0, t = 0; i < size; ++t) {
    // alpha, skip, skip, skip
    texture.image.data[i] = alpha[t] * 255
    i += 4
  }
  texture.needsUpdate = true
  return texture
}

export function createDitherDataTexture(width: number, height: number) {
  const data = new Uint8Array(4 * width * height)
  return new DataTexture(data, width, height)
}

const ditherMaterial = new ShaderMaterial({
  // settings
  transparent: false,
  side: DoubleSide,
  uniforms: {
    color: { value: new Color(0, 0, 0) },
    data: { value: null },
    /** Multiplies texel alpha (1 = full density). Used for smooth fades without re-uploading data. */
    fade: { value: 1 },
  },
  // vertex shader
  vertexShader: `
      precision highp float;
      varying vec2 vUv;
    
      void main() {
        vec4 mvPosition = vec4(position, 1.0);
        #ifdef USE_INSTANCING
        	mvPosition = instanceMatrix * mvPosition;
        #endif        
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        
        vUv = uv;
      }
    `,
  // fragment shader
  fragmentShader: `
      precision highp float;
      uniform vec3 color;
      uniform sampler2D data;
      uniform float fade;
  
      varying vec2 vUv;

      // adapted from https://www.shadertoy.com/view/Mlt3z8 (extended to 8x8)
      float bayerDither2x2( vec2 v ) {
        return mod( 3.0 * v.y + 2.0 * v.x, 4.0 );
      }

      float bayerDither4x4( vec2 v ) {
        vec2 P1 = mod( v, 2.0 );
        vec2 P2 = mod( floor( 0.5  * v ), 2.0 );
        return 4.0 * bayerDither2x2( P1 ) + bayerDither2x2( P2 );
      }

      float bayerDither8x8( vec2 v ) {
        vec2 P4 = mod( floor( 0.25 * v ), 2.0 );
        return 4.0 * bayerDither4x4( v ) + bayerDither2x2( P4 );
      }

      void main() {
        float alpha = texture2D(data, vUv).r * fade;
        if (alpha < 1.0) {
          vec2 ditherCoord = floor( mod( gl_FragCoord.xy, 8.0 ) );
          if ( bayerDither8x8( ditherCoord ) / 64.0 >= alpha ) {
            discard;
          }
        }

        gl_FragColor.rgba = vec4(color.xyz, 1.0);
      }
    `,
})

export function createDitherMaterial() {
  return cloneMaterial(ditherMaterial)
}

const blockditherMaterial = new ShaderMaterial({
  // settings
  transparent: false,
  side: DoubleSide,
  uniforms: {
    time,
    smoothrate: new Uniform(TICK_FPS),
    color: { value: new Color(0, 0, 0) },
    alpha: { value: 1 },
  },
  // vertex shader
  vertexShader: `
    precision highp float;
    attribute float visible;
    attribute vec3 nowposition;
    attribute mat4 lastmatrix;
    
    uniform float smoothrate;
    uniform float time;
  
    varying float vVisible;
  
    void main() {       
      vec4 mvPosition = vec4(position, 1.0);
      
      vec4 mvNowPosition = instanceMatrix * mvPosition;
      vec4 mvLastPosition = lastmatrix * mvPosition;

      float deltaPosition = clamp((time - nowposition.z) * smoothrate, 0.0, 1.0);
      mvPosition = mix(mvLastPosition, mvNowPosition, deltaPosition);

      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
      
      vVisible = visible;
    }
    `,
  // fragment shader
  fragmentShader: `
    precision highp float;
    uniform vec3 color;
    uniform float alpha;

    varying float vVisible;

    // adapted from https://www.shadertoy.com/view/Mlt3z8 (extended to 8x8)
    float bayerDither2x2( vec2 v ) {
      return mod( 3.0 * v.y + 2.0 * v.x, 4.0 );
    }

    float bayerDither4x4( vec2 v ) {
      vec2 P1 = mod( v, 2.0 );
      vec2 P2 = mod( floor( 0.5  * v ), 2.0 );
      return 4.0 * bayerDither2x2( P1 ) + bayerDither2x2( P2 );
    }

    float bayerDither8x8( vec2 v ) {
      vec2 P4 = mod( floor( 0.25 * v ), 2.0 );
      return 4.0 * bayerDither4x4( v ) + bayerDither2x2( P4 );
    }

    void main() {
      if (vVisible == 0.0) {
        discard;
      }
      if (alpha < 1.0) {
        vec2 ditherCoord = floor( mod( gl_FragCoord.xy, 8.0 ) );
        if ( bayerDither8x8( ditherCoord ) / 64.0 >= alpha ) {
          discard;
        }
      }

      gl_FragColor.rgba = vec4(color.xyz, 1.0);
    }
    `,
})

export function createBlockDitherMaterial() {
  return cloneMaterial(blockditherMaterial)
}
