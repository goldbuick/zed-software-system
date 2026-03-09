/**
 * Player/book flags API. Uses books (memoryensuresoftwarebook) and bookoperations.
 */
import {
  memoryclearbookflags,
  memoryhasbookflags,
  memoryreadbookflags,
} from './bookoperations'
import { memoryensuresoftwarebook } from './books'
import { MEMORY_LABEL } from './types'

export function memoryreadflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return memoryreadbookflags(mainbook, id)
}

export function memoryhasflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return memoryhasbookflags(mainbook, id)
}

export function memoryclearflags(id: string) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  return memoryclearbookflags(mainbook, id)
}
