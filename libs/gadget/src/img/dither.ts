import * as THREE from 'three'

import { cloneMaterial, interval, time } from './anim'
import { threeColors } from './colors'
import { TILE_FIXED_COLS, TILE_SIZE } from './types'

export function updateDitherDataTexture(
  texture: THREE.DataTexture,
  width: number,
  height: number,
  alpha: number[],
) {
  const size = width * height * 4
  for (let i = 0, t = 0; i < size; ++t) {
    // x, y, color, bg
    texture.image.data[i++] = alpha[t]
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
    map: { value: null },
    alt: { value: null },
    data: { value: null },
    colors: { value: threeColors },
    size: { value: new THREE.Vector2() },
    step: { value: new THREE.Vector2() },
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
      uniform sampler2D map;
      uniform sampler2D alt;
      uniform sampler2D data;
      uniform vec3 colors[32];
      uniform vec2 size;
      uniform vec2 step;
  
      varying vec2 vUv;
  
      void main() {
        #include <clipping_planes_fragment>
  
        vec4 lookupRange = texture2D(data, vUv);
        
        vec2 lookup;
        lookup.x = floor(lookupRange.x * 255.0);
        lookup.y = floor(lookupRange.y * 255.0);
        int ci = int(floor(lookupRange.z * 255.0));
        int bgi = int(floor(lookupRange.w * 255.0));
  
        vec2 charPosition = mod(vUv, size) / size;
        vec2 uv = vec2(charPosition.x * step.x, charPosition.y * step.y);
        vec3 color = colors[ci];
  
        uv += step * lookup;
        uv.y = 1.0 - uv.y;
  
        bool useAlt = mod(time, interval * 2.0) > interval;
        vec3 blip = useAlt ? texture2D(alt, uv).rgb : texture2D(map, uv).rgb;
  
        if (blip.r == 0.0) {
          color = colors[bgi];
        }
  
        gl_FragColor.rgb = color;
        gl_FragColor.a = 1.0;
      }
    `,
})

export function createDitherMaterial() {
  return cloneMaterial(ditherMaterial)
}
