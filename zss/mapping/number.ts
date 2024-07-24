import Alea from 'alea'
import { clamp } from 'maath/misc'

const prng = Alea('089fad0j9awfem09wavefc09uwaef')

export { clamp }

export function makeEven(value: number) {
  return 2 * Math.floor(value / 2)
}

export function snap(value: number, snap: number) {
  return Math.round(value / snap) * snap
}

export function randomNumber() {
  return prng()
}

export function randomInteger(a: number, b: number) {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  const delta = max - min + 1
  return min + Math.floor(randomNumber() * delta)
}
