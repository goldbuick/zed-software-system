import { MQ_CANVAS_HEIGHT, MQ_CANVAS_WIDTH } from '../tvcanvas'

import { blitvizcontrast } from './contrastblit'
import type {
  MQ_VISUALIZER_PRESET,
  MQ_VISUALIZER_PRESET_HANDLE,
  MQ_VISUALIZER_PRESET_OPTS,
} from './types'

const GEISS_MODE_COUNT = 9

const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const WARP_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_prev;
uniform float u_mode;
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform vec2 u_res;
out vec4 outColor;

vec2 warp(vec2 uv, float mode, float t, float bass, float mid) {
  vec2 c = uv - 0.5;
  float r = length(c);
  float a = atan(c.y, c.x);
  if (mode < 0.5) {
    c *= 1.0 - 0.02 - bass * 0.04;
  } else if (mode < 1.5) {
    c *= 1.02 + bass * 0.03;
  } else if (mode < 2.5) {
    float ang = 0.03 + mid * 0.08;
    float s = sin(ang);
    float co = cos(ang);
    c = vec2(co * c.x - s * c.y, s * c.x + co * c.y);
  } else if (mode < 3.5) {
    a += 0.08 + bass * 0.25;
    c = vec2(cos(a), sin(a)) * r * (1.0 - 0.015);
  } else if (mode < 4.5) {
    float z = 0.92 + bass * 0.08;
    c *= z;
    c.y += (uv.x - 0.5) * 0.04;
  } else if (mode < 5.5) {
    c.x *= 1.0 + 0.03 + mid * 0.05;
    c.y *= 1.0 - 0.01 - bass * 0.02;
  } else if (mode < 6.5) {
    float w = sin(r * 28.0 - t * 4.0) * (0.008 + bass * 0.02);
    c += normalize(c + 1e-5) * w;
  } else if (mode < 7.5) {
    a = mod(a, 1.04719755) - 0.523598775;
    c = vec2(cos(a), sin(a)) * r;
    c *= 1.0 - 0.02;
  } else {
    c.x += sin(t * 0.7 + uv.y * 6.0) * (0.01 + mid * 0.02);
    c.y += cos(t * 0.5 + uv.x * 5.0) * (0.01 + bass * 0.02);
    c *= 0.985;
  }
  return c + 0.5;
}

vec3 palette(float v) {
  float t = clamp(v, 0.0, 1.0);
  // Saturated midtones; never climb into near-white.
  vec3 a = vec3(0.0, 0.0, 0.02);
  vec3 b = vec3(0.0, 0.45, 0.38);
  vec3 c = vec3(0.55, 0.08, 0.48);
  vec3 d = vec3(0.55, 0.42, 0.12);
  if (t < 0.45) {
    return mix(a, b, pow(t / 0.45, 0.9));
  }
  if (t < 0.8) {
    return mix(b, c, (t - 0.45) / 0.35);
  }
  return mix(c, d, (t - 0.8) / 0.2);
}

void main() {
  vec2 uv = warp(v_uv, u_mode, u_time, u_bass, u_mid);
  uv = clamp(uv, 0.001, 0.999);
  vec4 prev = texture(u_prev, uv);
  // Strong decay so feedback cannot flood to white.
  float fade = 0.78 - u_bass * 0.06;
  float lum = dot(prev.rgb, vec3(0.299, 0.587, 0.114));
  lum = pow(clamp(lum, 0.0, 0.85), 1.35);
  vec3 col = palette(lum) * fade;
  outColor = vec4(min(col, vec3(0.7)), 1.0);
}
`

const SEED_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_scene;
uniform sampler2D u_wave;
uniform float u_amp;
out vec4 outColor;

void main() {
  vec4 scene = texture(u_scene, v_uv);
  float w = texture(u_wave, vec2(v_uv.x, 0.5)).r;
  float d = abs(v_uv.y - (0.5 + (w - 0.5) * u_amp));
  // Thin waveform line -- wide glow was flooding the frame white.
  float core = smoothstep(0.012, 0.0, d);
  float halo = smoothstep(0.03, 0.012, d) * 0.35;
  float glow = core + halo;
  vec3 seed = vec3(0.05, 0.75, 0.5) * glow + vec3(0.7, 0.1, 0.55) * core;
  vec3 outrgb = scene.rgb + seed * 0.45;
  outColor = vec4(min(outrgb, vec3(0.7)), 1.0);
}
`

const BLIT_FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
out vec4 outColor;
void main() {
  vec3 c = texture(u_tex, v_uv).rgb;
  // Levels: crush blacks, lift mid contrast, hard-cap highlights.
  c = (c - 0.05) / 0.75;
  c = clamp(c, 0.0, 1.0);
  c = pow(c, vec3(1.2));
  c *= 0.85;
  outColor = vec4(min(c, vec3(0.75)), 1.0);
}
`

function compileshader(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) {
    throw new Error('geiss shader alloc failed')
  }
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || 'compile failed'
    gl.deleteShader(shader)
    throw new Error('geiss shader: ' + info)
  }
  return shader
}

function makeprogram(
  gl: WebGL2RenderingContext,
  vert: WebGLShader,
  frag: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram()
  if (!program) {
    throw new Error('geiss program alloc failed')
  }
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) || 'link failed'
    gl.deleteProgram(program)
    throw new Error('geiss program: ' + info)
  }
  return program
}

function maketexture(gl: WebGL2RenderingContext, w: number, h: number) {
  const tex = gl.createTexture()
  if (!tex) {
    throw new Error('geiss texture alloc failed')
  }
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    w,
    h,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  )
  return tex
}

function makefbo(
  gl: WebGL2RenderingContext,
  tex: WebGLTexture,
): WebGLFramebuffer {
  const fbo = gl.createFramebuffer()
  if (!fbo) {
    throw new Error('geiss fbo alloc failed')
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0,
  )
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('geiss fbo incomplete')
  }
  return fbo
}

function startgeiss(
  opts: MQ_VISUALIZER_PRESET_OPTS,
): MQ_VISUALIZER_PRESET_HANDLE {
  const outcanvas = opts.canvas
  const outctx = outcanvas.getContext('2d')
  if (!outctx) {
    throw new Error('geiss needs 2d output canvas')
  }

  const glcanvas = document.createElement('canvas')
  glcanvas.width = MQ_CANVAS_WIDTH
  glcanvas.height = MQ_CANVAS_HEIGHT
  const gl = glcanvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
  })
  if (!gl) {
    throw new Error('geiss needs WebGL2')
  }
  const gfx = gl
  const blit = outctx

  const mode = Math.floor(Math.random() * GEISS_MODE_COUNT)
  const vert = compileshader(gfx, gfx.VERTEX_SHADER, VERT_SRC)
  const warpfrag = compileshader(gfx, gfx.FRAGMENT_SHADER, WARP_FRAG_SRC)
  const seedfrag = compileshader(gfx, gfx.FRAGMENT_SHADER, SEED_FRAG_SRC)
  const blitfrag = compileshader(gfx, gfx.FRAGMENT_SHADER, BLIT_FRAG_SRC)
  const warpprog = makeprogram(gfx, vert, warpfrag)
  const seedprog = makeprogram(gfx, vert, seedfrag)
  const blitprog = makeprogram(gfx, vert, blitfrag)

  const quad = gfx.createBuffer()
  if (!quad) {
    throw new Error('geiss buffer alloc failed')
  }
  gfx.bindBuffer(gfx.ARRAY_BUFFER, quad)
  gfx.bufferData(
    gfx.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gfx.STATIC_DRAW,
  )

  const texA = maketexture(gfx, MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)
  const texB = maketexture(gfx, MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)
  const fboA = makefbo(gfx, texA)
  const fboB = makefbo(gfx, texB)
  const wavetex = maketexture(gfx, opts.timedata.length, 1)

  let readtex = texA
  let writefbo = fboB
  let writetex = texB
  let animframe: number | null = null
  let active = true
  const t0 = performance.now()

  function bindquad(program: WebGLProgram) {
    const loc = gfx.getAttribLocation(program, 'a_pos')
    gfx.bindBuffer(gfx.ARRAY_BUFFER, quad)
    gfx.enableVertexAttribArray(loc)
    gfx.vertexAttribPointer(loc, 2, gfx.FLOAT, false, 0, 0)
  }

  function drawframe() {
    if (!active) {
      return
    }
    opts.analyser.getByteTimeDomainData(opts.timedata)
    opts.analyser.getByteFrequencyData(opts.freqdata)

    let bass = 0
    let mid = 0
    const bins = opts.freqdata
    const bassend = Math.min(24, bins.length)
    for (let i = 0; i < bassend; i += 1) {
      bass += bins[i]
    }
    bass = bass / (bassend * 255)
    const midstart = Math.floor(bins.length * 0.1)
    const midend = Math.floor(bins.length * 0.4)
    for (let i = midstart; i < midend; i += 1) {
      mid += bins[i]
    }
    mid = mid / Math.max(1, (midend - midstart) * 255)

    gfx.bindTexture(gfx.TEXTURE_2D, wavetex)
    gfx.pixelStorei(gfx.UNPACK_ALIGNMENT, 1)
    gfx.texImage2D(
      gfx.TEXTURE_2D,
      0,
      gfx.R8,
      opts.timedata.length,
      1,
      0,
      gfx.RED,
      gfx.UNSIGNED_BYTE,
      opts.timedata,
    )

    const t = (performance.now() - t0) / 1000

    // Unbind any sampled textures before attaching an FBO so Chromium cannot
    // see a feedback loop from a stale texture-unit binding.
    function cleartexunits() {
      gfx.activeTexture(gfx.TEXTURE0)
      gfx.bindTexture(gfx.TEXTURE_2D, null)
      gfx.activeTexture(gfx.TEXTURE1)
      gfx.bindTexture(gfx.TEXTURE_2D, null)
    }

    // Warp: sample readtex -> writefbo/writetex (must be different textures).
    cleartexunits()
    gfx.bindFramebuffer(gfx.FRAMEBUFFER, writefbo)
    gfx.viewport(0, 0, MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)
    gfx.useProgram(warpprog)
    bindquad(warpprog)
    gfx.activeTexture(gfx.TEXTURE0)
    gfx.bindTexture(gfx.TEXTURE_2D, readtex)
    gfx.uniform1i(gfx.getUniformLocation(warpprog, 'u_prev'), 0)
    gfx.uniform1f(gfx.getUniformLocation(warpprog, 'u_mode'), mode)
    gfx.uniform1f(gfx.getUniformLocation(warpprog, 'u_time'), t)
    gfx.uniform1f(gfx.getUniformLocation(warpprog, 'u_bass'), bass)
    gfx.uniform1f(gfx.getUniformLocation(warpprog, 'u_mid'), mid)
    gfx.uniform2f(
      gfx.getUniformLocation(warpprog, 'u_res'),
      MQ_CANVAS_WIDTH,
      MQ_CANVAS_HEIGHT,
    )
    gfx.drawArrays(gfx.TRIANGLES, 0, 6)

    // Seed: sample warp output (writetex) -> the other FBO (read slot).
    // Do not flip writefbo after this -- next warp still writes the other side.
    const seedfbo = writefbo === fboA ? fboB : fboA
    const seedtex = writefbo === fboA ? texB : texA
    cleartexunits()
    gfx.bindFramebuffer(gfx.FRAMEBUFFER, seedfbo)
    gfx.useProgram(seedprog)
    bindquad(seedprog)
    gfx.activeTexture(gfx.TEXTURE0)
    gfx.bindTexture(gfx.TEXTURE_2D, writetex)
    gfx.uniform1i(gfx.getUniformLocation(seedprog, 'u_scene'), 0)
    gfx.activeTexture(gfx.TEXTURE1)
    gfx.bindTexture(gfx.TEXTURE_2D, wavetex)
    gfx.uniform1i(gfx.getUniformLocation(seedprog, 'u_wave'), 1)
    gfx.uniform1f(gfx.getUniformLocation(seedprog, 'u_amp'), 0.18 + bass * 0.2)
    gfx.drawArrays(gfx.TRIANGLES, 0, 6)

    // Seed result becomes the next read; write target stays the warp buffer.
    readtex = seedtex

    cleartexunits()
    gfx.bindFramebuffer(gfx.FRAMEBUFFER, null)
    gfx.viewport(0, 0, MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)
    gfx.useProgram(blitprog)
    bindquad(blitprog)
    gfx.activeTexture(gfx.TEXTURE0)
    gfx.bindTexture(gfx.TEXTURE_2D, readtex)
    gfx.uniform1i(gfx.getUniformLocation(blitprog, 'u_tex'), 0)
    gfx.drawArrays(gfx.TRIANGLES, 0, 6)

    blitvizcontrast(blit, glcanvas)
    animframe = window.requestAnimationFrame(drawframe)
  }

  drawframe()

  return {
    stop: function () {
      active = false
      if (animframe) {
        window.cancelAnimationFrame(animframe)
        animframe = null
      }
      gfx.deleteProgram(warpprog)
      gfx.deleteProgram(seedprog)
      gfx.deleteProgram(blitprog)
      gfx.deleteShader(vert)
      gfx.deleteShader(warpfrag)
      gfx.deleteShader(seedfrag)
      gfx.deleteShader(blitfrag)
      gfx.deleteBuffer(quad)
      gfx.deleteTexture(texA)
      gfx.deleteTexture(texB)
      gfx.deleteTexture(wavetex)
      gfx.deleteFramebuffer(fboA)
      gfx.deleteFramebuffer(fboB)
      const lose = gfx.getExtension('WEBGL_lose_context')
      if (lose) {
        lose.loseContext()
      }
    },
  }
}

export const geisspreset: MQ_VISUALIZER_PRESET = {
  id: 'geiss',
  start: startgeiss,
}
