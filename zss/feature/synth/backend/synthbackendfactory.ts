import type { SynthBackend } from '../frontend/synthbackend'

import { bootwasmsynth } from './wasm/bootwasmsynth'
import { createwasmsynthadapter } from './wasmsynthadapter'

export async function createsynthbackend(): Promise<SynthBackend> {
  return createwasmsynthadapter(await bootwasmsynth())
}

export { createwasmsynthadapter } from './wasmsynthadapter'
