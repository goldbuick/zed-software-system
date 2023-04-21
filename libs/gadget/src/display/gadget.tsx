import { range } from '@zss/system/mapping/array'
import { randomInteger } from '@zss/system/mapping/number'
import { useRenderOnChange } from '@zss/yjs/binding'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import * as Y from 'yjs'

import { useClipping } from '../clipping'
import { createGadget, createGL } from '../data/gadget'
import defaultCharSetUrl from '../img/charset.png'
import { COLOR, threeColors } from '../img/colors'
import {
  createTilemapBufferGeometry,
  createTilemapDataTexture,
  writeTilemapDataTexture,
} from '../img/tilemap'
import useTexture from '../img/useTexture'
import { GADGET_LAYER } from '../types'

/*

What is a gadget ??
* a yjs MAP of data
* a thing with width & height
* a collection of layers
* there are different kinds of layers
  * tilemap (xy coords that match width & height of gadget)
  * objects (indivial outlined chars with xy coords with animated transitions)
  * input elements (button, radio button, text input, code edit, with animated transitions)

For the input elements, the point IS for them to manipulate the state of the Y.Map
even for buttons being pressed etc, a text input etc ..

*/

const doc = new Y.Doc()

const gadget = createGadget(doc, {})

const charsWidth = 2048
const charsHeight = 1024
const chars = range(charsWidth * charsHeight).map((code) => ({
  code: code % 5 === 0 ? 0 : 1 + (code % 8),
  color: 1 + (code % 31),
}))

const codesAndColors = createTilemapDataTexture(
  charsWidth,
  charsHeight,
  chars.map((c) => c.code),
  chars.map((c) => c.color),
)

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

export const material = new THREE.ShaderMaterial({
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
        texture2D(txt, vec2(left, top)).r == 0.0 &&
        texture2D(txt, vec2(uv.x, top)).r == 0.0 &&
        texture2D(txt, vec2(right, top)).r == 0.0 &&
        
        texture2D(txt, vec2(left, uv.y)).r == 0.0 &&
        texture2D(txt, vec2(right, uv.y)).r == 0.0 &&

        texture2D(txt, vec2(left, bottom)).r == 0.0 &&
        texture2D(txt, vec2(uv.x, bottom)).r == 0.0 &&
        texture2D(txt, vec2(right, bottom)).r == 0.0 
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

      uv.x += step.x * lookup.x;
      uv.y += step.y * lookup.y;
      uv.y = 1.0 - uv.y;

      bool useAlt = mod(time, interval * 2.0) > interval;
      vec3 blip = useAlt ? texture2D(alt, uv).rgb : texture2D(map, uv).rgb;

      if (transparent && blip.r == 0.0 &&
        (useAlt ? isEmpty(alt, uv, lookup) : isEmpty(map, uv, lookup))) {
        discard;
      }

      gl_FragColor.rgb = blip * color;
      gl_FragColor.a = dimmed != 0.0 ? dimmed : 1.0;
    }
  `,
})

export function Gadget() {
  const map = useTexture(defaultCharSetUrl)
  const bgRef = useRef<THREE.BufferGeometry>(null)

  useRenderOnChange(gadget)

  useEffect(() => {
    const testLayer = createGL(gadget, GADGET_LAYER.TILES, {
      width: 16,
      height: 16,
    })

    if (!bgRef.current) {
      return
    }

    createTilemapBufferGeometry(bgRef.current, charsWidth, charsHeight)

    console.info(bgRef.current, codesAndColors)
  }, [])

  useEffect(() => {
    function doot() {
      for (let i = 0; i < 50000; ++i) {
        writeTilemapDataTexture(
          codesAndColors,
          charsWidth,
          charsHeight,
          randomInteger(0, charsWidth - 1),
          randomInteger(0, charsHeight - 1),
          randomInteger(0, 255),
          randomInteger(0, COLOR.MAX - 1),
        )
      }
    }

    const timer = setInterval(doot, 10)
    return () => {
      clearInterval(timer)
    }
  }, [])

  const clippingPlanes = useClipping()

  useEffect(() => {
    const outline = 0.8
    const imageWidth = 16 * 10
    const imageHeight = 16 * 10
    material.transparent = true
    material.uniforms.map.value = map
    material.uniforms.alt.value = map
    material.uniforms.data.value = codesAndColors
    material.uniforms.dimmed.value = 0
    material.uniforms.transparent.value = true
    material.uniforms.size.value.x = 1 / charsWidth
    material.uniforms.size.value.y = 1 / charsHeight
    material.uniforms.step.value.x = 1 / 16
    material.uniforms.step.value.y = 1 / 16
    material.uniforms.ox.value = (1 / imageWidth) * outline
    material.uniforms.oy.value = (1 / imageHeight) * outline
    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [map, clippingPlanes])

  const scale = 1 //0.03122
  return (
    <mesh
      material={material}
      position={[0, 0, 10]}
      scale={[scale, scale, scale]}
    >
      <bufferGeometry ref={bgRef} />
    </mesh>
  )
}
