import type { SynthBackend } from 'zss/feature/synth/frontend/synthbackend'

import { bootdaisysynth } from './daisy/bootdaisysynth'
import { createdaisysynthadapter } from './daisy/daisysynthadapter'

export async function createsynthbackend(): Promise<SynthBackend> {
  return createdaisysynthadapter(await bootdaisysynth())
}

export { createdaisysynthadapter } from './daisy/daisysynthadapter'
