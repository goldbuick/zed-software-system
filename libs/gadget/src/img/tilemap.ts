import * as THREE from 'three'

import { threeColors } from '../img/colors'

export const TILE_SIZE = 10
export const HALF_TILE_SIZE = TILE_SIZE * 0.5

export const TILE_IMAGE_SIZE = 10

export const TILE_FIXED_WIDTH = 16

type TILE_CODES = (number | undefined)[]
type TILE_COLORS = (number | undefined)[]

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

export function writeTilemapDataTexture(
  texture: THREE.DataTexture,
  width: number,
  height: number,
  x: number,
  y: number,
  tcode: number | undefined,
  tcolor: number | undefined,
) {
  let i = (x + y * width) * 4
  const code = tcode ?? 0
  texture.image.data[i++] = code % TILE_FIXED_WIDTH
  texture.image.data[i++] = Math.floor(code / TILE_FIXED_WIDTH)
  texture.image.data[i++] = tcolor ?? 16
  texture.needsUpdate = true
}

export function updateTilemapDataTexture(
  texture: THREE.DataTexture,
  width: number,
  height: number,
  tcodes: TILE_CODES,
  tcolors: TILE_COLORS,
) {
  const size = width * height * 4
  for (let i = 0, t = 0; i < size; ++t) {
    const code = tcodes[t] ?? 0
    // x, y, color
    texture.image.data[i++] = code % TILE_FIXED_WIDTH
    texture.image.data[i++] = Math.floor(code / TILE_FIXED_WIDTH)
    texture.image.data[i++] = tcolors[t] ?? 16
    i++
  }
  texture.needsUpdate = true
  return texture
}

export function createTilemapDataTexture(
  width: number,
  height: number,
  tcodes: TILE_CODES,
  tcolors: TILE_COLORS,
) {
  const data = new Uint8Array(4 * width * height)
  const texture = new THREE.DataTexture(data, width, height)
  return updateTilemapDataTexture(texture, width, height, tcodes, tcolors)
}

export function createTilemapBufferGeometry(
  bg: THREE.BufferGeometry,
  width: number,
  height: number,
) {
  const right = width * TILE_SIZE
  const bottom = height * TILE_SIZE
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

  bg.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  bg.setAttribute('uv', new THREE.BufferAttribute(QUAD_UVS, 2))

  bg.computeBoundingBox()
  bg.computeBoundingSphere()
}

const epoch = Date.now()

const time = {
  get value() {
    return ((Date.now() - epoch) / 1000) % 10000.0
  },
}

// flip ever _other_ beat
const INTERVAL_RATE = 120

let intervalValue = 0
export function setAltInterval(bpm: number) {
  intervalValue = INTERVAL_RATE / bpm
}

// default to 150
setAltInterval(150)

const interval = {
  get value() {
    return intervalValue
  },
}

export const tilemapMaterial = new THREE.ShaderMaterial({
  // settings
  transparent: true,
  uniforms: {
    time,
    interval,
    dimmed: { value: 0 },
    transparent: { value: false },
    map: { value: null },
    alt: { value: null },
    data: { value: null },
    colors: { value: threeColors },
    size: { value: new THREE.Vector2() },
    step: { value: new THREE.Vector2() },
    ox: { value: 0 },
    oy: { value: 0 },
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
    uniform float dimmed;
    uniform float interval;
    uniform bool transparent;
    uniform sampler2D map;
    uniform sampler2D alt;
    uniform sampler2D data;
    uniform vec3 colors[32];
    uniform vec2 size;
    uniform vec2 step;
    uniform float ox;
    uniform float oy;

    varying vec2 vUv;

    bool isEmpty(sampler2D txt, vec2 uv, vec2 lookup) {
      float tx = floor(uv.x / step.x);
      float minx = tx * step.x + ox;
      float maxx = (tx + 1.0) * step.x - ox;

      float ty = floor(uv.y / step.y);
      float miny = ty * step.y + oy;
      float maxy = (ty + 1.0) * step.y - oy;

      float left = clamp(uv.x - ox, minx, maxx);
      float right = clamp(uv.x + ox, minx, maxx);
      float top = clamp(uv.y - oy, miny, maxy);
      float bottom = clamp(uv.y + oy, miny, maxy);

      return (
        texture2D(txt, vec2(uv.x, top)).r == 0.0 &&
        texture2D(txt, vec2(left, uv.y)).r == 0.0 &&
        texture2D(txt, vec2(right, uv.y)).r == 0.0 &&
        texture2D(txt, vec2(uv.x, bottom)).r == 0.0 
      );
    }

    void main() {
      #include <clipping_planes_fragment>

      vec4 lookupRange = texture2D(data, vUv);
      
      vec2 lookup;
      lookup.x = floor(lookupRange.x * 255.0);
      lookup.y = floor(lookupRange.y * 255.0);
      int ci = int(floor(lookupRange.z * 255.0));

      vec2 charPosition = mod(vUv, size) / size;
      vec2 uv = vec2(charPosition.x * step.x, charPosition.y * step.y);
      vec3 color = colors[ci];

      uv += step * lookup;
      uv.y = 1.0 - uv.y;

      bool useAlt = mod(time, interval * 2.0) > interval;
      vec3 blip = useAlt ? texture2D(alt, uv).rgb : texture2D(map, uv).rgb;

      if (transparent && blip.r == 0.0) {
        bool empty = useAlt ? isEmpty(alt, uv, lookup) : isEmpty(map, uv, lookup);
        if (empty) {
          discard;
        }
      }

      gl_FragColor.rgb = blip * color;
      gl_FragColor.a = dimmed != 0.0 ? dimmed : 1.0;
    }
  `,
})

function cloneMaterial(material: THREE.ShaderMaterial) {
  const clone = material.clone()
  clone.uniforms.time = time
  clone.uniforms.interval = interval
  return clone
}

export function createTilemapMaterial() {
  return cloneMaterial(tilemapMaterial)
}
