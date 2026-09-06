import {
  memoryclearbookflags,
  memoryhasbookflags,
  memoryreadbookflags,
} from './bookoperations'
import { memoryreadmainbook } from './session'
export function memoryreadflags(id: string) {
  const mainbook = memoryreadmainbook()
  return memoryreadbookflags(mainbook, id)
}

export function memoryhasflags(id: string) {
  const mainbook = memoryreadmainbook()
  return memoryhasbookflags(mainbook, id)
}

export function memoryclearflags(id: string) {
  const mainbook = memoryreadmainbook()
  return memoryclearbookflags(mainbook, id)
}
