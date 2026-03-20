import { ShaderMaterial } from 'three'
import { DEFAULT_BPM } from 'zss/mapping/tick'
const epoch = Date.now()

export const time = {
  get value() {
    return ((Date.now() - epoch) / 1000) % 1000000.0
  },
}

// flip ever _other_ beat
const INTERVAL_RATE = 120

let intervalValue = 0
export function setAltInterval(bpm: number) {
  intervalValue = INTERVAL_RATE / bpm
}

setAltInterval(DEFAULT_BPM)

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
