import { DoubleSide, ShaderMaterial, Uniform, Vector2 } from 'three'
import type { Color } from 'three'
import { RUNTIME } from 'zss/config'
import { COLOR } from 'zss/words/types'

import { UNICODE_ATLAS_COLS, getunicodeatlas } from './unicodeatlas'

const QUAD_POSITIONS = new Float32Array([
  0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0,
])
const QUAD_UVS = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1])

export function createunicodeoverlaymaterial(palette: Color[]) {
  const atlas = getunicodeatlas()
  const cellsize = new Vector2(
    RUNTIME.DRAW_CHAR_WIDTH(),
    RUNTIME.DRAW_CHAR_HEIGHT(),
  )
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      atlas: new Uniform(atlas),
      palette: new Uniform(palette),
      cellsize: new Uniform(cellsize),
      atlascols: new Uniform(UNICODE_ATLAS_COLS),
    },
    vertexShader: `
      precision highp float;
      attribute vec2 offset;
      attribute vec2 uvOffset;
      attribute float colorIndex;
      attribute float bgIndex;
      uniform vec2 cellsize;
      uniform float atlascols;
      varying vec2 vUv;
      varying float vColorIndex;
      varying float vBgIndex;
      void main() {
        vec3 worldPos = position * vec3(cellsize.x, cellsize.y, 1.0) + vec3(offset.x, offset.y, 0.001);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
        vUv = (uvOffset + uv) / atlascols;
        vColorIndex = colorIndex;
        vBgIndex = bgIndex;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform usampler2D atlas;
      uniform vec3 palette[16];
      varying vec2 vUv;
      varying float vColorIndex;
      varying float vBgIndex;
      void main() {
        float d = float(texture2D(atlas, vUv).r);
        float alpha = smoothstep(0.2, 0.5, d / 255.0);
        if (int(vBgIndex) >= ${COLOR.ONCLEAR} && alpha < 0.04) {
          discard;
        }
        int idx = int(vColorIndex);
        idx = clamp(idx, 0, 15);
        gl_FragColor.rgb = palette[idx];
        gl_FragColor.a = alpha;
      }
    `,
  })
}

export function getunicodeoverlayquadgeometry() {
  return {
    position: QUAD_POSITIONS,
    uv: QUAD_UVS,
  }
}
