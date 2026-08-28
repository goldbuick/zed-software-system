/**
 * VHS post pass for the media-queue compositor.
 * Port of LazarusOverlook's CC0 Godot shader (Shadertoy MdffD7 / FMS_Cat):
 * https://godotshaders.com/shader/vhs-post-processing/
 */
import {
  CanvasTexture,
  DataTexture,
  LinearFilter,
  Mesh,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  WebGLRenderer,
} from 'three'

import {
  MQ_CANVAS_CSS_HEIGHT,
  MQ_CANVAS_CSS_WIDTH,
  MQ_CANVAS_HEIGHT,
  MQ_CANVAS_WIDTH,
} from './tvcanvas'

/** Emulated tape resolution (Godot default). */
const VHS_RESOLUTION = new Vector2(640, 480)
/** Crease noise amplitude. */
const VHS_CREASE_NOISE = 1.0
/** Crease flash opacity. */
const VHS_CREASE_OPACITY = 0.5
/** YIQ filter intensity. */
const VHS_FILTER_INTENSITY = 0.1
/** Tape crease horizontal smear. */
const VHS_TAPE_CREASE_SMEAR = 0.2
/** Tape crease band strength. */
const VHS_TAPE_CREASE_INTENSITY = 0.2
/** Tape crease time jitter. */
const VHS_TAPE_CREASE_JITTER = 0.1
/** Tape crease scroll speed. */
const VHS_TAPE_CREASE_SPEED = 0.5
/** Chroma rotation on crease. */
const VHS_TAPE_CREASE_DISCOLORATION = 1.0
/** Bottom switching-noise band thickness (tape lines). */
const VHS_BOTTOM_BORDER_THICKNESS = 6.0
/** Bottom switching-noise jitter. */
const VHS_BOTTOM_BORDER_JITTER = 6.0
/** Color noise from noise texture. */
const VHS_NOISE_INTENSITY = 0.1
/** Overall gain after Godot YIQ filter (restores midtones vs source). */
const VHS_GAIN = 1.42
/** Additive lift on dark tones only (0-1 RGB); applied after VHS, before gain. */
const VHS_SHADOW_LIFT = 0.08

const NOISE_SIZE = 256

const vhsvertexshader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const vhsfragmentshader = `
uniform sampler2D tDiffuse;
uniform sampler2D noiseTexture;
uniform float time;
uniform vec2 vhsResolution;
uniform float creaseNoise;
uniform float creaseOpacity;
uniform float filterIntensity;
uniform float tapeCreaseSmear;
uniform float tapeCreaseIntensity;
uniform float tapeCreaseJitter;
uniform float tapeCreaseSpeed;
uniform float tapeCreaseDiscoloration;
uniform float bottomBorderThickness;
uniform float bottomBorderJitter;
uniform float noiseIntensity;
uniform float gain;
uniform float shadowLift;

varying vec2 vUv;

const int VHS_SAMPLES = 2;
const float PI = 3.14159265;

float v2random(vec2 uv) {
  return texture2D(noiseTexture, mod(uv, vec2(1.0))).x;
}

mat2 rotate2D(float t) {
  return mat2(vec2(cos(t), sin(t)), vec2(-sin(t), cos(t)));
}

vec3 rgb2yiq(vec3 rgb) {
  return mat3(
    vec3(0.299, 0.596, 0.211),
    vec3(0.587, -0.274, -0.523),
    vec3(0.114, -0.322, 0.312)
  ) * rgb;
}

vec3 yiq2rgb(vec3 yiq) {
  return mat3(
    vec3(1.0, 1.0, 1.0),
    vec3(0.956, -0.272, -1.106),
    vec3(0.621, -0.647, 1.703)
  ) * yiq;
}

vec3 vhxTex2D(sampler2D tex, vec2 uv, float rot) {
  vec3 yiq = vec3(0.0);
  for (int i = 0; i < VHS_SAMPLES; i++) {
    float fi = float(i);
    vec3 sampleRgb = texture2D(
      tex,
      uv - vec2(fi, 0.0) / vhsResolution
    ).xyz;
    yiq += rgb2yiq(sampleRgb)
      * vec2(fi, float(VHS_SAMPLES - 1 - i)).yxx
      / float(VHS_SAMPLES - 1)
      / float(VHS_SAMPLES)
      * 2.0;
  }
  if (rot != 0.0) {
    yiq.yz *= rotate2D(rot * tapeCreaseDiscoloration);
  }
  return yiq2rgb(yiq);
}

vec3 liftshadows(vec3 rgb, float amount) {
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  float w = 1.0 - smoothstep(0.04, 0.22, luma);
  return rgb + amount * w;
}

void main() {
  vec2 uvn = vUv;
  vec3 col = vec3(0.0);

  // Tape wave.
  uvn.x += (v2random(vec2(uvn.y / 10.0, time / 10.0)) - 0.5)
    / vhsResolution.x;
  uvn.x += (v2random(vec2(uvn.y, time * 10.0)) - 0.5)
    / vhsResolution.x;

  // Tape crease.
  float tcPhase = smoothstep(
    0.9,
    0.96,
    sin(
      uvn.y * 8.0
        - (time * tapeCreaseSpeed
          + tapeCreaseJitter * v2random(time * vec2(0.67, 0.59)))
          * PI * 1.2
    )
  );
  float tcNoise = smoothstep(0.3, 1.0, v2random(vec2(uvn.y * 4.77, time)));
  float tc = tcPhase * tcNoise;
  uvn.x = uvn.x - tc / vhsResolution.x * 8.0 * tapeCreaseSmear;

  // Switching noise (bottom border).
  float snPhase = smoothstep(
    1.0 - bottomBorderThickness / vhsResolution.y,
    1.0,
    uvn.y
  );
  uvn.x += snPhase
    * (v2random(vec2(vUv.y * 100.0, time * 10.0)) - 0.5)
    / vhsResolution.x
    * bottomBorderJitter;

  // Fetch with YIQ horizontal smear.
  col = vhxTex2D(tDiffuse, uvn, tcPhase * 0.2 + snPhase * 2.0);

  // Crease noise flash.
  float cn = tcNoise * creaseNoise
    * (0.7 * tcPhase * tapeCreaseIntensity + 0.3);
  if (0.29 < cn) {
    vec2 V = vec2(0.0, creaseOpacity);
    vec2 uvt = (uvn + V.yx * v2random(vec2(uvn.y, time))) * vec2(0.1, 1.0);
    float n0 = v2random(uvt);
    float n1 = v2random(uvt + V.yx / vhsResolution.x);
    if (n1 < n0) {
      col = mix(col, 2.0 * V.yyy, pow(n0, 10.0));
    }
  }

  // AC beat.
  col *= 1.0 + 0.1 * smoothstep(
    0.4,
    0.6,
    v2random(vec2(0.0, 0.1 * (vUv.y + time * 0.2)) / 10.0)
  );

  // Color noise.
  col *= 1.0 - noiseIntensity * 0.5
    + noiseIntensity
      * texture2D(
        noiseTexture,
        mod(uvn * vec2(1.0, 1.0) + time * vec2(5.97, 4.45), vec2(1.0))
      ).xyz;
  col = clamp(col, 0.0, 1.0);

  // YIQ filter.
  col = rgb2yiq(col);
  col = vec3(1.33, 1.1, 1.5) * col + vec3(0.1, -0.1, 0.0) * filterIntensity;
  col = yiq2rgb(col);

  col = liftshadows(col, shadowLift);
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
  noisetexture: DataTexture
  scene: Scene
  camera: OrthographicCamera
  material: ShaderMaterial
  geometry: PlaneGeometry
  startms: number
}

let state: VHS_PASS_STATE | null = null

function createnoisetexture(): DataTexture {
  const size = NOISE_SIZE
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (Math.random() * 255) | 0
    data[i + 1] = (Math.random() * 255) | 0
    data[i + 2] = (Math.random() * 255) | 0
    data[i + 3] = 255
  }
  const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType)
  tex.colorSpace = NoColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

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

  const noisetexture = createnoisetexture()

  const material = new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: texture },
      noiseTexture: { value: noisetexture },
      time: { value: 0 },
      vhsResolution: { value: VHS_RESOLUTION.clone() },
      creaseNoise: { value: VHS_CREASE_NOISE },
      creaseOpacity: { value: VHS_CREASE_OPACITY },
      filterIntensity: { value: VHS_FILTER_INTENSITY },
      tapeCreaseSmear: { value: VHS_TAPE_CREASE_SMEAR },
      tapeCreaseIntensity: { value: VHS_TAPE_CREASE_INTENSITY },
      tapeCreaseJitter: { value: VHS_TAPE_CREASE_JITTER },
      tapeCreaseSpeed: { value: VHS_TAPE_CREASE_SPEED },
      tapeCreaseDiscoloration: { value: VHS_TAPE_CREASE_DISCOLORATION },
      bottomBorderThickness: { value: VHS_BOTTOM_BORDER_THICKNESS },
      bottomBorderJitter: { value: VHS_BOTTOM_BORDER_JITTER },
      noiseIntensity: { value: VHS_NOISE_INTENSITY },
      gain: { value: VHS_GAIN },
      shadowLift: { value: VHS_SHADOW_LIFT },
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
    noisetexture,
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
  state.noisetexture.dispose()
  state.renderer.dispose()
  if (state.glcanvas.parentNode) {
    state.glcanvas.remove()
  }
  state = null
}
