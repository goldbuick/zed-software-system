import { DoubleSide, ShaderMaterial, Uniform, Vector2 } from 'three'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'
import { TICK_FPS } from 'zss/mapping/tick'

import { convertpalettetocolors } from '../data/palette'
import { noiseutilshader } from '../fx/util'

import { cloneMaterial, interval, time } from './anim'
import { createbitmaptexture } from './textures'

const palette = convertpalettetocolors(loadpalettefrombytes(PALETTE))
const charset = createbitmaptexture(loadcharsetfrombytes(CHARSET))

const billboardsMaterial = new ShaderMaterial({
  // settings
  transparent: false,
  side: DoubleSide,
  uniforms: {
    time,
    interval,
    smoothrate: new Uniform(TICK_FPS),
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
    size: new Uniform(new Vector2()),
    pixel: new Uniform(new Vector2()),
    flip: new Uniform(true),
  },
  // vertex shader
  vertexShader: `
    precision highp float;
    attribute float visible;
    attribute vec4 display;
    attribute vec3 lastposition;
    attribute vec2 lastcolor;
    attribute vec2 lastbg;

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
    varying vec2 vDisplay;
    varying vec3 vColor;
    varying vec4 vBg;

    ${noiseutilshader}

    float PI = radians(180.0);

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

    float exponentialInOut(float t) {
      return t == 0.0 || t == 1.0
        ? t
        : t < 0.5
          ? +0.5 * pow(2.0, (20.0 * t) - 10.0)
          : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
    }

    float cyclefromtime() {
      float flux = snoise(vDisplay.xy * 5.0) * 0.05;
      float cycle = mod(time * 2.5 + flux, interval * 2.0) / interval;
      return exponentialInOut(abs(cycle - 1.0));
    }

    void main() {
      vVisible = visible;

      float deltaPosition = animDelta(lastposition.z, smoothrate, 1.0);
      vec2 animPosition = mix(lastposition.xy, position.xy, deltaPosition);

      float deltaColor = animDelta(lastcolor.y, smoothrate, 1.0);
      int sourceColori = int(round(lastcolor.x));
      int destColori = int(round(display.z));

      vec3 sourceColor;
      if (sourceColori > 32) {
        sourceColor = palette[sourceColori - 33];
      } else {
        sourceColor = palette[sourceColori % 16];
      }

      vec3 destColor;
      if (destColori > 32) {
        destColor = palette[destColori - 33];
      } else {
        destColor = palette[destColori % 16];
      }

      vColor = mix(sourceColor, destColor, deltaColor);

      float deltaBg = animDelta(lastbg.y, smoothrate, 1.0);
      vec4 sourceBg = bgFromIndex(lastbg.x);
      vec4 destBg = bgFromIndex(display.w);
      vBg = mix(sourceBg, destBg, deltaBg);

      if (destColori > 31) {
        vColor = mix(vBg.rgb, vColor, cyclefromtime());
      }

      vDisplay.xy = display.xy;

      animPosition *= pointSize;
      animPosition += pointSize * 0.5;
      animPosition.x -= 1.0;

      // model space
      vec4 mvPosition = vec4(animPosition, 0.0, 1.0);
      #ifdef USE_INSTANCING
      	mvPosition = instanceMatrix * mvPosition;
      #endif
      mvPosition = modelViewMatrix * mvPosition;
  
      // transform to screenspace 
      gl_Position = projectionMatrix * mvPosition;

      // this handles things being scaled
      float fov = 2.0 * atan(1.0 / projectionMatrix[1][1]) * 180.0 / PI;
      float heightOfNearPlane = screenheight / (2.0 * tan(0.5 * fov * PI / 180.0));
      gl_PointSize = (heightOfNearPlane * pointSize.y) / gl_Position.w;
    }
  `,
  // fragment shader
  fragmentShader: `
    uniform float time;
    uniform float interval;
    uniform sampler2D map;
    uniform sampler2D alt;
    uniform float rows;
    uniform vec2 step;
    uniform vec2 size;
    uniform vec2 pixel;
    uniform vec2 pointSize;
    uniform bool flip;

    varying float vVisible;
    varying vec2 vDisplay;
    varying vec3 vColor;
    varying vec4 vBg;

    void main() {
      float xscale = pointSize.y / pointSize.x;
      float xpadding = (pointSize.y - pointSize.x) / pointSize.y;
      float px = gl_PointCoord.x * xscale - xpadding;      
      
      if (vVisible == 0.0 || px < 0.0 || px > 1.0) {
        discard;
      }
      
      float py = gl_PointCoord.y;
      if (flip) {
        py = 1.0 - py;
      }

      vec2 idx = vec2(px, py) * size * pixel;
      vec2 lookup = vec2(vDisplay.x, rows - vDisplay.y) * step * pixel;
      vec2 uv = lookup + idx + vec2(1.0, 1.0) * pixel;

      bool useAlt = mod(time, interval * 2.0) > interval;
      vec3 blip = useAlt ? texture2D(alt, uv).rgb : texture2D(map, uv).rgb;

      if (blip.r == 0.0) {
        if (vBg.a < 0.001) {
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
