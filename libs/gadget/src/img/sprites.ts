import * as THREE from 'three'

import { cloneMaterial, interval, time } from './anim'
import { COLOR, threeColors } from './colors'

const pointsMaterial = new THREE.ShaderMaterial({
  // settings
  transparent: true,
  uniforms: {
    time,
    interval,
    rate: { value: 15.0 },
    map: { value: null },
    alt: { value: null },
    pointSize: { value: 1 },
    colors: { value: threeColors },
    rows: { value: 1 },
    step: { value: new THREE.Vector2() },
    ox: { value: 0 },
    oy: { value: 0 },
    tindex: { value: COLOR.MAGENTA },
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
    uniform float pointSize;
    uniform vec3 colors[32];
    uniform float tindex;

    varying vec2 vCharData;
    varying vec3 vColor;
    varying vec4 vBg;
    
    float rand(float co) {
      return fract(sin(co*(91.3458)) * 47453.5453);
    }

    vec3 colorFromIndex(float index) {
      return colors[int(index)];
    }

    vec4 empty;

    vec4 bgFromIndex(float index) {
      if (index == tindex) {
        return empty;
      }
      vec4 bg;
      bg.rgb = colorFromIndex(index);
      bg.a = 1.0;
      return bg;
    }

    void main() {
      float deltaPosition = clamp((time - lastPosition.z) * rate, 0.0, 1.0);
      vec2 animPosition = mix(lastPosition.xy, position.xy, deltaPosition);

      animPosition += vec2(0.5, 0.5);

      float deltaShake = 1.0 - clamp((time - animShake.y) * rate * 0.5, 0.0, 1.0);
      animPosition += vec2(
        deltaShake - rand(cos(time) + animShake.x) * deltaShake * 2.0,
        deltaShake - rand(sin(time) + animShake.x) * deltaShake * 2.0
      ) * 0.5;

      float deltaBounce = 1.0 - abs(1.0 - clamp((time - animBounce.y) * rate, 0.0, 2.0));
      animPosition.y -= smoothstep(0.0, 1.0, deltaBounce);

      float deltaColor = clamp((time - lastColor.y) * rate * 0.4, 0.0, 1.0);
      vec3 sourceColor = colorFromIndex(lastColor.x);
      vec3 destColor = colorFromIndex(charData.z);
      vColor = mix(sourceColor, destColor, deltaColor);

      float deltaBg = clamp((time - lastBg.y) * rate * 0.4, 0.0, 1.0);
      vec4 sourceBg = bgFromIndex(lastBg.x);
      vec4 destBg = bgFromIndex(charData.w);
      vBg = mix(sourceBg, destBg, deltaBg);

      vCharData.xy = charData.xy;

      vec4 mvPosition = modelViewMatrix * vec4(animPosition * pointSize, 0.0, 1.0);
      gl_Position = projectionMatrix * mvPosition;      

      gl_PointSize = pointSize;
      
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
    uniform float ox;
    uniform float oy;

    varying vec2 vCharData;
    varying vec3 vColor;
    varying vec4 vBg;

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
      
      vec2 lookup = vec2(vCharData.x, vCharData.y);

      vec2 idx = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
      vec2 char = vec2(lookup.x * step.x, (15.0 - lookup.y) * step.y);
      vec2 uv = idx * step + char;

      bool useAlt = mod(time, interval * 2.0) > interval;
      vec3 blip = useAlt ? texture2D(alt, uv).rgb : texture2D(map, uv).rgb;

      if (blip.r == 0.0) {
        if (vBg.a < 0.1) {
          bool empty = useAlt ? isEmpty(alt, uv, lookup) : isEmpty(map, uv, lookup);
          if (empty) {
            discard;
          }
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

export function createPointsMaterial() {
  return cloneMaterial(pointsMaterial)
}
