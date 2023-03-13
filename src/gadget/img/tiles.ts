import * as THREE from 'three'

import { getThreeColor } from '@/gadget/img/colors'

export const TILE_SIZE = 6
export const HALF_TILE_SIZE = TILE_SIZE * 0.5

export const TILE_IMAGE_SIZE = 10
export const TILE_PADDING = 1

const TILE_IMAGE_STEP = 12

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

export function cloneMaterial(material: THREE.ShaderMaterial) {
  const clone = material.clone()
  clone.uniforms.time = time
  clone.uniforms.interval = interval
  return clone
}

export const terrainMaterial = new THREE.ShaderMaterial({
  // settings
  transparent: true,
  uniforms: {
    time,
    interval,
    dimmed: { value: 0 },
    transparent: { value: false },
    map: { value: null },
    alt: { value: null },
    ox: { value: 0 },
    oy: { value: 0 },
  },
  // vertex shader
  vertexShader: `
    #include <clipping_planes_pars_vertex>

    attribute float alpha;
    attribute vec3 color;

    varying float vAlpha;
    varying vec3 vColor;
    varying vec2 vUv;
  
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      vAlpha = alpha;
      vColor = color;
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

    varying float vAlpha;
    varying vec3 vColor;
    varying vec2 vUv;

    void main() {
      #include <clipping_planes_fragment>

      if (transparent && vAlpha < 1.0) {
        discard;
      }

      bool useAlt = mod(time, interval * 2.0) > interval;      
      if (useAlt) {
        gl_FragColor.rgb = texture2D(alt, vUv).rgb * vColor;
      } else {
        gl_FragColor.rgb = texture2D(map, vUv).rgb * vColor;
      }

      gl_FragColor.a = dimmed != 0.0 ? dimmed : 1.0;
    }
  `,
})

export const objectMaterial = new THREE.ShaderMaterial({
  // settings
  transparent: true,
  uniforms: {
    time,
    interval,
    dimmed: { value: 0 },
    transparent: { value: false },
    map: { value: null },
    alt: { value: null },
    ox: { value: 0 },
    oy: { value: 0 },
  },
  // vertex shader
  vertexShader: `
    #include <clipping_planes_pars_vertex>
    
    attribute float alpha;
    attribute vec3 color;

    varying float vAlpha;
    varying vec3 vColor;
    varying vec2 vUv;
  
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      vAlpha = alpha;
      vColor = color;
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
    uniform sampler2D map;
    uniform sampler2D alt;
    uniform float ox;
    uniform float oy;

    varying float vAlpha;
    varying vec3 vColor;
    varying vec2 vUv;

    bool isEmpty(sampler2D txt) {
      return 
        texture2D(txt, vUv + vec2(-ox, -oy)).r == 0.0 &&
        texture2D(txt, vUv + vec2(0, -oy)).r == 0.0 &&
        texture2D(txt, vUv + vec2(ox, -oy)).r == 0.0 &&

        texture2D(txt, vUv + vec2(-ox, 0)).r == 0.0 &&
        texture2D(txt, vUv + vec2(0, 0)).r == 0.0 &&
        texture2D(txt, vUv + vec2(ox, 0)).r == 0.0 &&
        
        texture2D(txt, vUv + vec2(ox, oy)).r == 0.0 &&
        texture2D(txt, vUv + vec2(-ox, oy)).r == 0.0 &&
        texture2D(txt, vUv + vec2(0, oy)).r == 0.0;
    }

    void main() {
      #include <clipping_planes_fragment>

      if (vAlpha < 1.0) {
        discard;
      }

      bool useAlt = mod(time, interval * 2.0) > interval;      
      
      bool empty = false;
      if (useAlt) {
        empty = isEmpty(alt);
      } else {
        empty = isEmpty(map);
      }
      
      if (empty) {
        discard;
      }

      if (useAlt) {
        gl_FragColor.rgb = texture2D(alt, vUv).rgb * vColor;
      } else {
        gl_FragColor.rgb = texture2D(map, vUv).rgb * vColor;
      }
      gl_FragColor.a = dimmed != 0.0 ? dimmed : 1.0;
    }
  `,
})

export function updateTiles(
  bg: THREE.BufferGeometry,
  tileSize: number,
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
  tiles: (number | null | undefined)[],
  tcolors: (number | undefined)[],
) {
  const alphas = bg.attributes.alpha
  const colors = bg.attributes.color
  const uvs = bg.attributes.uv
  const cols = Math.floor(imageWidth / TILE_IMAGE_STEP)

  let index = 0
  let offset = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const empty = tiles[offset] ?? true

      if (empty === true) {
        alphas.setX(index, 0)
        alphas.setX(index + 1, 0)
        alphas.setX(index + 2, 0)
        alphas.setX(index + 3, 0)

        colors.setXYZ(index, 0, 0, 0)
        colors.setXYZ(index + 1, 0, 0, 0)
        colors.setXYZ(index + 2, 0, 0, 0)
        colors.setXYZ(index + 3, 0, 0, 0)

        uvs.setXY(index, 0, 0)
        uvs.setXY(index + 1, 0, 0)
        uvs.setXY(index + 2, 0, 0)
        uvs.setXY(index + 3, 0, 0)
      } else {
        const color = getThreeColor(tcolors[offset] ?? 0)

        const tindex = tiles[offset] ?? 0
        const tx = tindex % cols
        const ty = Math.floor(tindex / cols)

        const left = tx * TILE_IMAGE_STEP + TILE_PADDING
        const right = left + TILE_IMAGE_SIZE
        const top = imageHeight - ty * TILE_IMAGE_STEP - TILE_PADDING
        const bottom = top - TILE_IMAGE_SIZE

        const u1 = left / imageWidth
        const u2 = right / imageWidth
        const v1 = top / imageHeight
        const v2 = bottom / imageHeight

        alphas.setX(index, 1)
        alphas.setX(index + 1, 1)
        alphas.setX(index + 2, 1)
        alphas.setX(index + 3, 1)

        colors.setXYZ(index, color.r, color.g, color.b)
        colors.setXYZ(index + 1, color.r, color.g, color.b)
        colors.setXYZ(index + 2, color.r, color.g, color.b)
        colors.setXYZ(index + 3, color.r, color.g, color.b)

        uvs.setXY(index, u1, v1)
        uvs.setXY(index + 1, u2, v1)
        uvs.setXY(index + 2, u2, v2)
        uvs.setXY(index + 3, u1, v2)
      }

      index += 4
      offset += 1
    }
  }

  bg.attributes.alpha.needsUpdate = true
  bg.attributes.color.needsUpdate = true
  bg.attributes.uv.needsUpdate = true
}

export function makeTiles(
  bg: THREE.BufferGeometry,
  tileSize: number,
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
  tiles: (number | null | undefined)[],
  tcolors: (number | undefined)[],
) {
  const indices: number[] = []
  const positions: number[] = []
  const alphas: number[] = []
  const colors: number[] = []
  const uvs: number[] = []

  let index = 0
  let offset = 0
  const ox = width * tileSize * -0.5
  const oy = height * tileSize * 0.5
  const cols = Math.floor(imageWidth / TILE_IMAGE_STEP)

  for (let y = 0; y < height; y += 1) {
    const py = oy + y * -tileSize
    for (let x = 0; x < width; x += 1) {
      const px = ox + x * tileSize

      indices.push(index, index + 2, index + 1)
      indices.push(index, index + 3, index + 2)
      index += 4

      positions.push(px, py, 0)
      positions.push(px + tileSize, py, 0)
      positions.push(px + tileSize, py - tileSize, 0)
      positions.push(px, py - tileSize, 0)

      const empty = tiles[offset] ?? true
      if (empty === true) {
        alphas.push(0, 0, 0, 0)

        colors.push(0, 0, 0)
        colors.push(0, 0, 0)
        colors.push(0, 0, 0)
        colors.push(0, 0, 0)

        uvs.push(0, 0)
        uvs.push(0, 0)
        uvs.push(0, 0)
        uvs.push(0, 0)
      } else {
        const color = getThreeColor(tcolors[offset] ?? 0)

        const tindex = tiles[offset] ?? 0
        const tx = tindex % cols
        const ty = Math.floor(tindex / cols)

        const left = tx * TILE_IMAGE_STEP + TILE_PADDING
        const right = left + TILE_IMAGE_SIZE
        const top = imageHeight - ty * TILE_IMAGE_STEP - TILE_PADDING
        const bottom = top - TILE_IMAGE_SIZE

        const u1 = left / imageWidth
        const u2 = right / imageWidth
        const v1 = top / imageHeight
        const v2 = bottom / imageHeight

        alphas.push(1, 1, 1, 1)

        colors.push(color.r, color.g, color.b)
        colors.push(color.r, color.g, color.b)
        colors.push(color.r, color.g, color.b)
        colors.push(color.r, color.g, color.b)

        uvs.push(u1, v1)
        uvs.push(u2, v1)
        uvs.push(u2, v2)
        uvs.push(u1, v2)
      }

      offset += 1
    }
  }

  bg.setIndex(indices)
  bg.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  bg.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1))
  bg.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  bg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  bg.computeBoundingBox()
  bg.computeBoundingSphere()
}
