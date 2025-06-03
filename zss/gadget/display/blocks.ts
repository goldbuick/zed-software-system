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
    data: new Uniform(null),
    size: { value: new Vector2() },
    step: { value: new Vector2() },
    flip: new Uniform(true),
  },
  // vertex shader
  vertexShader: `
    uniform float time;
    uniform float interval;

    varying vec2 vUv;

    void main() {
      vec2 blockPosition = vec2(position.xy) * size;
      vec4 mvPosition = modelViewMatrix * vec4(blockPosition, position.z, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      vUv = uv;
    }
  `,
  // fragment shader
  fragmentShader: `
    uniform float time;
    uniform float interval;
    uniform sampler2D map;
    uniform sampler2D alt;

    void main() {
      gl_FragColor.rgb = vec3(0.0, 1.0, 1.0);
      gl_FragColor.a = 1.0;
    }
  `,
})

export function createBlocksMaterial() {
  return cloneMaterial(blocksMaterial)
}
