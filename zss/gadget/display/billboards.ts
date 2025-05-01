import { DoubleSide, ShaderMaterial, Uniform, Vector2 } from 'three'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'
import { TICK_FPS } from 'zss/mapping/tick'

import { convertpalettetocolors } from '../data/palette'

import { cloneMaterial, interval, time } from './anim'
import { createbitmaptexture } from './textures'

const smoothrate = TICK_FPS

const palette = convertpalettetocolors(loadpalettefrombytes(PALETTE))
const charset = createbitmaptexture(loadcharsetfrombytes(CHARSET))

const billboardsMaterial = new ShaderMaterial({
  // settings
  transparent: false,
  side: DoubleSide,
  uniforms: {
    time,
    interval,
    smoothrate: new Uniform(smoothrate),
    palette: new Uniform(palette),
    map: new Uniform(charset),
    alt: new Uniform(charset),
    dpr: new Uniform(1),
    screenwidth: new Uniform(1),
    screenheight: new Uniform(1),
    pointSize: {
      value: new Vector2(1, 1),
    },
    rows: new Uniform(1),
    step: new Uniform(new Vector2()),
    flip: new Uniform(true),
  },
  // vertex shader
  vertexShader: `
    #include <clipping_planes_pars_vertex>

    attribute float visible;
    attribute vec4 charData;
    attribute vec3 lastPosition;
    attribute vec2 lastColor;
    attribute vec2 lastBg;
    attribute vec2 animShake;
    attribute vec2 animBounce;

    uniform float smoothrate;
    uniform float time;
    uniform float interval;
    uniform vec2 pointSize;
    uniform vec3 palette[16];
    uniform float dpr;
    uniform float screenwidth;
    uniform float screenheight;
    uniform float tindex;

    varying float vVisible;
    varying vec2 vCharData;
    varying vec3 vColor;
    varying vec4 vBg;

    float rand(float co) {
      return fract(sin(co*(91.3458)) * 47453.5453);
    }

    vec3 colorFromIndex(float index) {
      return palette[int(index)];
    }

    vec4 bgFromIndex(float index) {
      vec4 bg;
      if (int(index) >= 16) {
        return vec4(0.0, 0.0, 0.0, 0.0);
      }
      bg.rgb = colorFromIndex(index);
      bg.a = 1.0;
      return bg;
    }

    float animDelta(float startTime, float deltaMod, float maxDelta) {
      float delta = time - startTime;
      if (delta < 0.0) {
        return maxDelta;
      }
      return clamp(delta * deltaMod, 0.0, maxDelta);
    }

    void main() {
      vVisible = visible;

      float deltaPosition = clamp((time - lastPosition.z) * smoothrate, 0.0, 1.0);
      vec2 animPosition = mix(lastPosition.xy, position.xy, deltaPosition);

      float deltaShake = 1.0 - animDelta(animShake.y, smoothrate * 0.5, 1.0); 
      animPosition += vec2(
        deltaShake - rand(cos(time) + animShake.x) * deltaShake * 2.0,
        deltaShake - rand(sin(time) + animShake.x) * deltaShake * 2.0
      ) * 0.5;

      float deltaBounce = 1.0 - abs(1.0 - animDelta(animBounce.y, smoothrate, 2.0));
      animPosition.y -= smoothstep(0.0, 1.0, deltaBounce);

      float deltaColor = animDelta(lastColor.y, smoothrate, 1.0);
      vec3 sourceColor = colorFromIndex(lastColor.x);
      vec3 destColor = colorFromIndex(charData.z);
      vColor = mix(sourceColor, destColor, deltaColor);

      float deltaBg = animDelta(lastBg.y, smoothrate, 1.0);
      vec4 sourceBg = bgFromIndex(lastBg.x);
      vec4 destBg = bgFromIndex(charData.w);
      vBg = mix(sourceBg, destBg, deltaBg);

      vCharData.xy = charData.xy;

      // draw space
      animPosition *= pointSize;
      animPosition.x += pointSize.x * 0.5;
      animPosition.x -= (pointSize.y - pointSize.x) - dpr;
      animPosition.y += pointSize.y * 0.5;

      // model space
      vec4 mvPosition = modelViewMatrix * vec4(animPosition, 0.0, 1.0);

      // transform to screenspace 
      gl_Position = projectionMatrix * mvPosition;

      // this handles things being scaled
      float ptsize = (pointSize.y * dpr) + (screenwidth / screenheight) * dpr;
      
      gl_PointSize = (screenheight * ptsize) / gl_Position.w;
      gl_Position.y -= pointSize.y;
      
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
    uniform float rows;
    uniform vec2 step;
    uniform vec2 pointSize;
    uniform bool flip;

    varying float vVisible;
    varying vec2 vCharData;
    varying vec3 vColor;
    varying vec4 vBg;

    void main() {
      #include <clipping_planes_fragment>

      float xscale = pointSize.y / pointSize.x;
      float px = gl_PointCoord.x * xscale;
      
      if (vVisible == 0.0 || px >= 1.0) {
        discard;
      }

      vec2 lookup = vec2(vCharData.x, vCharData.y);

      float py = gl_PointCoord.y;
      if (flip) {
        py = 1.0 - py;
      }
      vec2 idx = vec2(px, py);
      vec2 char = vec2(lookup.x * step.x, (rows - lookup.y) * step.y);
      vec2 uv = idx * step + char;

      bool useAlt = mod(time, interval * 2.0) > interval;
      vec3 blip = useAlt ? texture2D(alt, uv).rgb : texture2D(map, uv).rgb;

      if (blip.r == 0.0) {
        if (vBg.a < 1.0) {
          discard;
        } else {
          gl_FragColor = vBg;
        }
      } else {
        gl_FragColor.rgb = vColor;
        gl_FragColor.a = 1.0;
      }
    }
  `,
})

export function createBillboardsMaterial() {
  return cloneMaterial(billboardsMaterial)
}
