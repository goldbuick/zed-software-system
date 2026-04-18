import { DoubleSide, ShaderMaterial, Uniform, Vector2 } from 'three'
import type { Color } from 'three'
import { RUNTIME } from 'zss/config'
import { COLOR } from 'zss/words/types'

import { UNICODE_ATLAS_COLS, UNICODE_SDF_EDGE, getunicodeatlas } from './unicodeatlas'

const QUAD_POSITIONS = new Float32Array([
  0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0,
])
const QUAD_UVS = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1])

const SDF_EDGE = UNICODE_SDF_EDGE

export function createunicodeoverlaymaterial(
  palette: Color[],
  outline = false,
) {
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
      useoutline: new Uniform(outline ? 1 : 0),
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
      uniform sampler2D atlas;
      uniform vec3 palette[16];
      uniform float useoutline;
      varying vec2 vUv;
      varying float vColorIndex;
      varying float vBgIndex;
      void main() {
        float d = texture2D(atlas, vUv).r;
        float aa = fwidth(d) * 0.75;
        float alpha = smoothstep(${SDF_EDGE} - aa, ${SDF_EDGE} + aa, d);
        if (int(vBgIndex) >= ${COLOR.ONCLEAR} && alpha < 0.02) {
          discard;
        }
        int idx = int(vColorIndex);
        idx = clamp(idx, 0, 15);
        vec3 fg = palette[idx];
        if (useoutline > 0.5) {
          float outlineAlpha = smoothstep(0.35 - aa, 0.35 + aa, d);
          vec3 edge = vec3(0.0);
          gl_FragColor.rgb = mix(edge, fg, alpha);
          gl_FragColor.a = outlineAlpha;
        } else {
          gl_FragColor.rgb = fg;
          gl_FragColor.a = alpha;
        }
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
