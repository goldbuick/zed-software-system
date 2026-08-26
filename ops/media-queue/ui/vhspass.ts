import {
  CanvasTexture,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three'

import {
  MQ_CANVAS_CSS_HEIGHT,
  MQ_CANVAS_CSS_WIDTH,
  MQ_CANVAS_HEIGHT,
  MQ_CANVAS_WIDTH,
} from './tvcanvas'

/** Horizontal RGB channel split (UV space). */
const VHS_ABERRATION = 0.0016
/** Scanline darkening strength (0-1). Peak dip only; average stays near 1. */
const VHS_SCANLINE = 0.12
/** Film grain amplitude. */
const VHS_GRAIN = 0.07
/** Edge vignette strength. */
const VHS_VIGNETTE = 0.18
/** Vertical tracking wobble amplitude (UV). */
const VHS_WOBBLE = 0.0022
/** Rare horizontal tear strength. */
const VHS_TEAR = 0.012
/** Mild contrast lift after wash. */
const VHS_CONTRAST = 1.1
/** Saturation scale (1 = untouched). */
const VHS_SATURATION = 0.95
/** Overall gain so VHS look does not crush midtones. */
const VHS_GAIN = 1.12

const vhsvertexshader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const vhsfragmentshader = `
uniform sampler2D tDiffuse;
uniform float time;
uniform vec2 resolution;
uniform float aberration;
uniform float scanline;
uniform float grainAmt;
uniform float vignette;
uniform float wobbleAmt;
uniform float tearAmt;
uniform float contrast;
uniform float saturation;
uniform float gain;

varying vec2 vUv;

float hash12(vec2 p) {
  float h = dot(p, vec2(127.1, 311.7));
  return fract(sin(h) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  float t = time;
  float wobble = sin(t * 2.1 + uv.y * 28.0) * aberration * 0.35
    + sin(t * 0.7 + uv.y * 9.0) * wobbleAmt;
  float tearband = step(0.992, hash12(vec2(floor(t * 3.0), floor(uv.y * 40.0))));
  float tear = tearband * tearAmt * (hash12(vec2(t, uv.y)) - 0.5);

  vec2 base = vec2(uv.x + wobble + tear, uv.y);
  float ab = aberration + 0.0004 * sin(t * 1.3);
  float r = texture2D(tDiffuse, base + vec2(ab, 0.0)).r;
  float g = texture2D(tDiffuse, base).g;
  float b = texture2D(tDiffuse, base - vec2(ab, 0.0)).b;
  vec3 col = vec3(r, g, b);

  // Dip toward (1 - scanline), never a fixed 0.85 floor.
  float scans = 1.0 - scanline * (0.5 - 0.5 * sin(uv.y * resolution.y * 3.14159 + t * 8.0));
  col *= scans;

  float grain = (hash12(uv * resolution.xy + t * 60.0) - 0.5) * grainAmt;
  col += grain;

  float vig = smoothstep(0.95, 0.35, length(uv - 0.5) * 1.35);
  col *= mix(1.0 - vignette, 1.0, vig);

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, saturation);
  col = (col - 0.5) * contrast + 0.5;
  col *= gain;
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`

type VHS_PASS_STATE = {
  scenecanvas: HTMLCanvasElement
  glcanvas: HTMLCanvasElement
  renderer: WebGLRenderer
  texture: CanvasTexture
  scene: Scene
  camera: OrthographicCamera
  material: ShaderMaterial
  geometry: PlaneGeometry
  startms: number
}

let state: VHS_PASS_STATE | null = null

/**
 * Keep the GL canvas capturable: Chromium often yields black captureStream
 * frames when the WebGL canvas is opacity:0 / not composited. Park it
 * off-screen at full CSS size instead.
 */
function placeglcanvas(el: HTMLCanvasElement) {
  el.style.position = 'fixed'
  el.style.left = '-10000px'
  el.style.top = '0'
  el.style.width = `${MQ_CANVAS_CSS_WIDTH}px`
  el.style.height = `${MQ_CANVAS_CSS_HEIGHT}px`
  el.style.opacity = '1'
  el.style.pointerEvents = 'none'
  el.style.zIndex = '-1'
}

/**
 * Build (or return) the WebGL output canvas that applies VHS to scenecanvas.
 */
export function ensurevhspass(
  scenecanvas: HTMLCanvasElement,
): HTMLCanvasElement {
  if (state && state.scenecanvas === scenecanvas) {
    return state.glcanvas
  }
  if (state) {
    resetvhspass()
  }

  const glcanvas = document.createElement('canvas')
  glcanvas.width = MQ_CANVAS_WIDTH
  glcanvas.height = MQ_CANVAS_HEIGHT
  placeglcanvas(glcanvas)
  document.body.appendChild(glcanvas)

  const renderer = new WebGLRenderer({
    canvas: glcanvas,
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  })
  renderer.setSize(MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT, false)
  renderer.setPixelRatio(1)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.autoClear = true
  renderer.setClearColor(0x0a0a12, 1)

  const texture = new CanvasTexture(scenecanvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = false
  texture.flipY = true
  texture.needsUpdate = true

  const material = new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: texture },
      time: { value: 0 },
      resolution: {
        value: { x: MQ_CANVAS_WIDTH, y: MQ_CANVAS_HEIGHT },
      },
      aberration: { value: VHS_ABERRATION },
      scanline: { value: VHS_SCANLINE },
      grainAmt: { value: VHS_GRAIN },
      vignette: { value: VHS_VIGNETTE },
      wobbleAmt: { value: VHS_WOBBLE },
      tearAmt: { value: VHS_TEAR },
      contrast: { value: VHS_CONTRAST },
      saturation: { value: VHS_SATURATION },
      gain: { value: VHS_GAIN },
    },
    vertexShader: vhsvertexshader,
    fragmentShader: vhsfragmentshader,
    depthTest: false,
    depthWrite: false,
  })

  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new PlaneGeometry(2, 2)
  scene.add(new Mesh(geometry, material))

  state = {
    scenecanvas,
    glcanvas,
    renderer,
    texture,
    scene,
    camera,
    material,
    geometry,
    startms: performance.now(),
  }

  // First draw before captureStream callers attach, so the track is not empty.
  rendervhspass()
  return glcanvas
}

export function rendervhspass() {
  if (!state) {
    return
  }
  state.texture.needsUpdate = true
  state.material.uniforms.time.value =
    (performance.now() - state.startms) / 1000
  state.renderer.render(state.scene, state.camera)
}

export function resetvhspass() {
  if (!state) {
    return
  }
  state.geometry.dispose()
  state.material.dispose()
  state.texture.dispose()
  state.renderer.dispose()
  if (state.glcanvas.parentNode) {
    state.glcanvas.remove()
  }
  state = null
}
