const epoch = Date.now()

export const time = {
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

export const interval = {
  get value() {
    return intervalValue
  },
}

export function cloneMaterial(material: THREE.ShaderMaterial) {
  const clone = material.clone()
  clone.uniforms.time = time
  clone.uniforms.interval = interval
  return clone
}
