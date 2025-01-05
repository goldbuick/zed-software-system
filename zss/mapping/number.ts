import Alea from 'alea'
import { clamp } from 'maath/misc'

const prng = Alea('089fad0j9awfem09wavefc09uwaef')

export { clamp }

export function makeeven(value: number) {
  return 2 * Math.floor(value / 2)
}

export function snap(value: number, snap: number) {
  return Math.round(value / snap) * snap
}

export function randomnumber() {
  return prng()
}

export function randomnumberwith(seed: string) {
  const rng = Alea(seed)
  return rng()
}

export function randominteger(a: number, b: number) {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  const delta = max - min + 1
  return min + Math.floor(randomnumber() * delta)
}

export function randomintegerwith(seed: string, a: number, b: number) {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  const delta = max - min + 1
  return min + Math.floor(randomnumberwith(seed) * delta)
}
