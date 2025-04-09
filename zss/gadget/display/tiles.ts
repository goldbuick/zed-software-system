import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  RGBAIntegerFormat,
  ShaderMaterial,
  Uniform,
  UnsignedByteType,
  Vector2,
} from 'three'
import { RUNTIME } from 'zss/config'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'
import { MAYBE } from 'zss/mapping/types'
import { COLOR } from 'zss/words/types'

import { convertpalettetocolors } from '../data/palette'
import { CHARS_PER_ROW } from '../data/types'

import { cloneMaterial, interval, time } from './anim'
import { createbitmaptexture } from './textures'

type TILE_CHARS = MAYBE<number>[]
type TILE_COLORS = MAYBE<number>[]

const BOTTOM_LEFT = [0, 1, 0]
const BOTTOM_RIGHT = [1, 1, 0]
const TOP_RIGHT = [1, 0, 0]
const TOP_LEFT = [0, 0, 0]

const QUAD_POSITIONS = new Float32Array([
  ...BOTTOM_LEFT,
  ...TOP_RIGHT,
  ...BOTTOM_RIGHT,
  ...BOTTOM_LEFT,
  ...TOP_LEFT,
  ...TOP_RIGHT,
])

const QUAD_UVS = new Float32Array([
  ...BOTTOM_LEFT.slice(0, 2),
  ...TOP_RIGHT.slice(0, 2),
  ...BOTTOM_RIGHT.slice(0, 2),

  ...BOTTOM_LEFT.slice(0, 2),
  ...TOP_LEFT.slice(0, 2),
  ...TOP_RIGHT.slice(0, 2),
])

export function updateTilemapDataTexture(
  texture: DataTexture,
  width: number,
  height: number,
  tchar: TILE_CHARS,
  tcolor: TILE_COLORS,
  tbg: TILE_COLORS,
) {
  const size = width * height * 4
  for (let i = 0, t = 0; i < size; ++t) {
    const char = tchar[t] ?? 0
    // x, y, color, bg
    texture.image.data[i++] = char % CHARS_PER_ROW
    texture.image.data[i++] = Math.floor(char / CHARS_PER_ROW)
    texture.image.data[i++] = tcolor[t] ?? 16
    texture.image.data[i++] = tbg[t] ?? 16
  }
  texture.needsUpdate = true
  return texture
}

export function createTilemapDataTexture(width: number, height: number) {
  const data = new Uint8Array(4 * width * height)
  const texture = new DataTexture(
    data,
    width,
    height,
    RGBAIntegerFormat,
    UnsignedByteType,
  )
  texture.internalFormat = 'RGBA8UI'
  return texture
}

export function createTilemapBufferGeometry(
  bg: BufferGeometry,
  width: number,
  height: number,
) {
  const right = width * RUNTIME.DRAW_CHAR_WIDTH()
  const bottom = height * RUNTIME.DRAW_CHAR_HEIGHT()
  const positions = QUAD_POSITIONS.map((v, index) => {
    switch (index % 3) {
      case 0:
        return v * right
      case 1:
        return v * bottom
      default:
        return v
    }
  })

  bg.setAttribute('position', new BufferAttribute(positions, 3))
  bg.setAttribute('uv', new BufferAttribute(QUAD_UVS, 2))

  bg.computeBoundingBox()
  bg.computeBoundingSphere()
}

const palette = convertpalettetocolors(loadpalettefrombytes(PALETTE))
const charset = createbitmaptexture(loadcharsetfrombytes(CHARSET))

const tilemapMaterial = new ShaderMaterial({
  // settings
  transparent: false,
  uniforms: {
    time,
    interval,
    palette: new Uniform(palette),
    map: new Uniform(charset),
    alt: new Uniform(charset),
    data: new Uniform(null),
    size: { value: new Vector2() },
    step: { value: new Vector2() },
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
    uniform usampler2D data;
    uniform vec3 palette[16];
    uniform vec2 size;
    uniform vec2 step;
    varying vec2 vUv;

    void main() {
      #include <clipping_planes_fragment>

      uvec4 tiledata = texture(data, vUv);
      int colori = int(tiledata.z);
      int bgi = int(tiledata.w);

      vec2 charPosition = mod(vUv, size) / size;
      vec2 uv = vec2(charPosition.x * step.x, charPosition.y * step.y);
      vec3 color = palette[colori];

      uv.x += step.x * float(tiledata.x);
      uv.y += step.y * float(tiledata.y);
      uv.y = 1.0 - uv.y;

      bool useAlt = mod(time, interval * 2.0) > interval;
      vec3 blip = useAlt ? texture(alt, uv).rgb : texture(map, uv).rgb;

      if (blip.r == 0.0) {
        if (bgi >= ${COLOR.ONCLEAR}) {
          discard;
        }
        color = palette[bgi];
      }

      gl_FragColor.rgb = color;
      gl_FragColor.a = 1.0;
    }
  `,
})

export function createTilemapMaterial() {
  return cloneMaterial(tilemapMaterial)
}
