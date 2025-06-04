import { DoubleSide, ShaderMaterial, Uniform, Vector2 } from 'three'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'

import { convertpalettetocolors } from '../data/palette'

import { cloneMaterial, interval, time } from './anim'
import { createbitmaptexture } from './textures'

const palette = convertpalettetocolors(loadpalettefrombytes(PALETTE))
const charset = createbitmaptexture(loadcharsetfrombytes(CHARSET))

const blocksMaterial = new ShaderMaterial({
  // settings
  transparent: false,
  side: DoubleSide,
  uniforms: {
    time,
    interval,
    palette: new Uniform(palette),
    map: new Uniform(charset),
    alt: new Uniform(charset),
    cols: new Uniform(1),
    rows: new Uniform(1),
    step: new Uniform(new Vector2()),
  },
  // vertex shader
  vertexShader: `
    uniform float time;
    uniform float interval;
    uniform float size;

    varying vec2 vUv;
    varying vec3 vColor;

    void main() {
      vUv = uv;
      vColor.xyz = instanceColor.xyz;
      
      vec4 mvPosition = vec4(position, 1.0);
      mvPosition = instanceMatrix * mvPosition;
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // fragment shader
  fragmentShader: `
    uniform float time;
    uniform float interval;
    uniform sampler2D map;
    uniform sampler2D alt;
    uniform vec3 palette[16];
    uniform vec2 step;
    uniform float cols;
    uniform float rows;

    varying vec2 vUv;
    varying vec3 vColor;
    
    vec3 colorFromIndex(float index) {
      return palette[int(index)];
    }

    void main() {
      // r = char, g = color, b = bg
      int tc = int(cols);
      int ti = int(vColor.r);
      float tx = float(ti % tc);
      float ty = rows - floor(vColor.r / cols);

      vec2 uv = vUv * step + vec2(tx * step.x, ty * step.y);
      bool useAlt = mod(time, interval * 2.0) > interval;
      vec3 blip = useAlt ? texture(alt, uv).rgb : texture(map, uv).rgb;

      if (blip.r == 0.0) {
        gl_FragColor.rgb = colorFromIndex(vColor.b);
      } else {
        gl_FragColor.rgb = colorFromIndex(vColor.g);
      }      
      gl_FragColor.a = 1.0;
    }
  `,
})

export function createBlocksMaterial() {
  return cloneMaterial(blocksMaterial)
}
