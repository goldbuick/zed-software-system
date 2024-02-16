import * as THREE from 'three'

import {
  DRAW_CHAR_HEIGHT,
  DRAW_CHAR_WIDTH,
  SPRITES_TINDEX,
} from '../data/types'

import { cloneMaterial, interval, time } from './anim'

const spritesMaterial = new THREE.ShaderMaterial({
  // settings
  transparent: true,
  uniforms: {
    time,
    interval,
    rate: { value: 15.0 },
    map: { value: null },
    alt: { value: null },
    palette: { value: null },
    pointSize: {
      value: new THREE.Vector2(DRAW_CHAR_WIDTH, DRAW_CHAR_HEIGHT),
    },
    rows: { value: 1 },
    step: { value: new THREE.Vector2() },
  },
  // vertex shader
  vertexShader: `
    #include <clipping_planes_pars_vertex>

    attribute vec4 charData;
    attribute vec3 lastPosition;
    attribute vec2 lastColor;
    attribute vec2 lastBg;
    attribute vec2 animShake;
    attribute vec2 animBounce;

    uniform float rate;
    uniform float time;
    uniform float interval;
    uniform vec2 pointSize;
    uniform vec3 palette[16];
    uniform float tindex;

    varying vec2 vCharData;
    varying vec3 vColor;
    varying vec4 vBg;
    
    float rand(float co) {
      return fract(sin(co*(91.3458)) * 47453.5453);
    }

    vec3 colorFromIndex(float index) {
      return palette[int(index)];
    }

    vec4 empty;

    vec4 bgFromIndex(float index) {
      if (int(index) <= ${SPRITES_TINDEX}) {
        return empty;
      }
      vec4 bg;
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
      float deltaPosition = clamp((time - lastPosition.z) * rate, 0.0, 1.0);
      vec2 animPosition = mix(lastPosition.xy, position.xy, deltaPosition);

      float deltaShake = 1.0 - animDelta(animShake.y, rate * 0.5, 1.0); 
      animPosition += vec2(
        deltaShake - rand(cos(time) + animShake.x) * deltaShake * 2.0,
        deltaShake - rand(sin(time) + animShake.x) * deltaShake * 2.0
      ) * 0.5;

      float deltaBounce = 1.0 - abs(1.0 - animDelta(animBounce.y, rate, 2.0));
      animPosition.y -= smoothstep(0.0, 1.0, deltaBounce);

      float deltaColor = animDelta(lastColor.y, rate * 0.4, 1.0);
      vec3 sourceColor = colorFromIndex(lastColor.x);
      vec3 destColor = colorFromIndex(charData.z);
      vColor = mix(sourceColor, destColor, deltaColor);

      float deltaBg = animDelta(lastBg.y, rate * 0.4, 1.0);
      vec4 sourceBg = bgFromIndex(lastBg.x);
      vec4 destBg = bgFromIndex(charData.w);
      vBg = mix(sourceBg, destBg, deltaBg);

      vCharData.xy = charData.xy;

      animPosition = animPosition * pointSize;
      animPosition += pointSize * 0.5;
      animPosition.x += (pointSize.y - pointSize.x) * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(animPosition, 0.0, 1.0);
      gl_Position = projectionMatrix * mvPosition;      

      // this handles things being scaled
      gl_PointSize = pointSize.y * modelViewMatrix[0][0];
      
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

    varying vec2 vCharData;
    varying vec3 vColor;
    varying vec4 vBg;

    void main() {
      #include <clipping_planes_fragment>

      float xscale = pointSize.y / pointSize.x;
      float px = gl_PointCoord.x * xscale;
      
      if (px > 1.0) {
        discard;
      }

      vec2 lookup = vec2(vCharData.x, vCharData.y);

      vec2 idx = vec2(px, 1.0 - gl_PointCoord.y);
      vec2 char = vec2(lookup.x * step.x, (rows - lookup.y) * step.y);
      vec2 uv = idx * step + char;

      bool useAlt = mod(time, interval * 2.0) > interval;
      vec3 blip = useAlt ? texture2D(alt, uv).rgb : texture2D(map, uv).rgb;

      // gl_FragColor.rgb = vec3(1.0, 0.0, 1.0);
      // gl_FragColor.a = 1.0;

      if (blip.r == 0.0) {
        gl_FragColor = vBg;
      } else {
        gl_FragColor.rgb = vColor;
        gl_FragColor.a = 1.0;
      }
    }
  `,
})

export function createSpritesMaterial() {
  return cloneMaterial(spritesMaterial)
}
