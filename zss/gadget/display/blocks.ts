import { Color, DoubleSide, ShaderMaterial, Uniform, Vector2 } from 'three'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'
import { COLOR } from 'zss/words/types'

import { convertpalettetocolors } from '../data/palette'
import { noiseutilshader } from '../fx/util'

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
    step: new Uniform(new Vector2()),
  },
  // vertex shader
  vertexShader: `
    precision highp float;
    uniform float time;
    uniform float interval;

    varying vec2 vUv;
    varying vec3 vColor;

    void main() {
      vUv = uv;
    
      vec4 mvPosition = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        vColor.xyz = instanceColor.xyz;
      	mvPosition = instanceMatrix * mvPosition;
      #endif        
      
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // fragment shader
  fragmentShader: `
    precision highp float;
    uniform float time;
    uniform float interval;
    uniform sampler2D map;
    uniform sampler2D alt;
    uniform vec3 palette[16];
    uniform vec2 step;
    uniform float cols;

    varying vec2 vUv;
    varying vec3 vColor;

    ${noiseutilshader}

    float exponentialInOut(float t) {
      return t == 0.0 || t == 1.0
        ? t
        : t < 0.5
          ? +0.5 * pow(2.0, (20.0 * t) - 10.0)
          : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
    }

    float cyclefromtime() {
      float flux = snoise(gl_FragCoord.xy * 5.0) * 0.05;
      float cycle = mod(time * 2.5 + flux, interval * 2.0) / interval;
      return exponentialInOut(abs(cycle - 1.0));
    }
      
    void main() {
      // r = char, g = color, b = bg
      int tc = int(round(cols));
      int ti = int(round(vColor.r));
      float tx = float(ti % tc);
      float ty = floor(float(ti) / cols);

      int colori = int(round(vColor.g));
      int bgi = int(round(vColor.b));

      vec3 color;
      if (colori > 31) {
        vec3 bg = palette[bgi];
        color = palette[colori - 33];
        float cycle = mod(time * 2.5, interval * 2.0) / interval;
        color = mix(bg, color, cyclefromtime());
      } else {
        color = palette[colori % 16];
      }

      vec3 bg = palette[bgi];

      vec2 uv = vUv * step + vec2(tx * step.x, ty * step.y);
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

export function createBlocksMaterial() {
  return cloneMaterial(blocksMaterial)
}

const blocksBillboardMaterial = new ShaderMaterial({
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
    step: new Uniform(new Vector2()),
  },
  // vertex shader
  vertexShader: `
    precision highp float;
    uniform float time;
    uniform float interval;

    varying vec2 vUv;
    varying vec3 vColor;

    void main() {
      vUv = uv;
    
      vec4 mvPosition = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        vColor.xyz = instanceColor.xyz;
        mvPosition = instanceMatrix * mvPosition;
      #endif        
      
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // fragment shader
  fragmentShader: `
    precision highp float;
    uniform float time;
    uniform float interval;
    uniform sampler2D map;
    uniform sampler2D alt;
    uniform vec3 palette[16];
    uniform vec2 step;
    uniform float cols;

    varying vec2 vUv;
    varying vec3 vColor;

    ${noiseutilshader}

    float exponentialInOut(float t) {
      return t == 0.0 || t == 1.0
        ? t
        : t < 0.5
          ? +0.5 * pow(2.0, (20.0 * t) - 10.0)
          : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
    }

    float cyclefromtime() {
      float flux = snoise(gl_FragCoord.xy * 5.0) * 0.05;
      float cycle = mod(time * 2.5 + flux, interval * 2.0) / interval;
      return exponentialInOut(abs(cycle - 1.0));
    }
      
    void main() {
      // r = char, g = color, b = bg
      int tc = int(round(cols));
      int ti = int(round(vColor.r));
      float tx = float(ti % tc);
      float ty = floor(float(ti) / cols);

      int colori = int(round(vColor.g));
      int bgi = int(round(vColor.b));

      vec3 color;
      if (colori > 31) {
        vec3 bg = palette[bgi];
        color = palette[colori - 33];
        float cycle = mod(time * 2.5, interval * 2.0) / interval;
        color = mix(bg, color, cyclefromtime());
      } else {
        color = palette[colori % 16];
      }

      vec3 bg = palette[bgi];

      vec2 uv = vUv * step + vec2(tx * step.x, ty * step.y);
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

export function createBlocksBillboardMaterial() {
  return cloneMaterial(blocksBillboardMaterial)
}

const darknessMaterial = new ShaderMaterial({
  // settings
  transparent: false,
  side: DoubleSide,
  uniforms: {
    color: { value: new Color(0, 0, 0) },
    data: { value: null },
  },
  // vertex shader
  vertexShader: `
    precision highp float;
    varying float vAlpha;
  
    void main() {
      vec4 mvPosition = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        vAlpha = instanceColor.x;
        mvPosition = instanceMatrix * mvPosition;
      #endif        
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
    }
    `,
  // fragment shader
  fragmentShader: `
    precision highp float;
    uniform vec3 color;
    uniform sampler2D data;

    varying float vAlpha;

    // adapted from https://www.shadertoy.com/view/Mlt3z8
    float bayerDither2x2( vec2 v ) {
      return mod( 3.0 * v.y + 2.0 * v.x, 4.0 );
    }

    float bayerDither4x4( vec2 v ) {
      vec2 P1 = mod( v, 2.0 );
      vec2 P2 = mod( floor( 0.5  * v ), 2.0 );
      return 4.0 * bayerDither2x2( P1 ) + bayerDither2x2( P2 );
    }

    void main() {
      if (vAlpha < 1.0) {
        vec2 ditherCoord = floor( mod( gl_FragCoord.xy, 4.0 ) );
        if ( bayerDither4x4( ditherCoord ) / 16.0 >= vAlpha ) {
          discard;
        }
      }

      gl_FragColor.rgba = vec4(color.xyz, 1.0);
    }
    `,
})

export function createdarknessmaterial() {
  return cloneMaterial(darknessMaterial)
}
