import { ShaderMaterial } from 'three'
import { DEFAULT_BPM } from 'zss/mapping/tick'
const epoch = Date.now()

export const time = {
  get value() {
    return ((Date.now() - epoch) / 1000) % 1000000.0
  },
}

// Shader interval (seconds per half-cycle), derived from BPM — used for color shimmer / timing on bright glyphs.
const INTERVAL_RATE = 120

// 120 / 136 = 0.8823529411764706
const intervalValue = INTERVAL_RATE / DEFAULT_BPM

export const interval = {
  get value() {
    return intervalValue
  },
}

export function cloneMaterial(material: ShaderMaterial) {
  const clone = material.clone()
  clone.uniforms.time = time
  clone.uniforms.interval = interval
  return clone
}
