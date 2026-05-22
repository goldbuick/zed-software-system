import {
  memoryclearbookflags,
  memoryhasbookflags,
  memoryreadbookflags,
} from './bookoperations'
import { memoryreadbookbysoftware } from './session'
import { MEMORY_LABEL } from './types'

export function memoryreadflags(id: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  return memoryreadbookflags(mainbook, id)
}

export function memoryhasflags(id: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  return memoryhasbookflags(mainbook, id)
}

export function memoryclearflags(id: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  return memoryclearbookflags(mainbook, id)
}
