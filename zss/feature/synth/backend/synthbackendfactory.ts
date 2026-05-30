import type { SynthBackend } from '../frontend/synthbackend'

import { bootdaisysynth } from './daisy/bootdaisysynth'
import { createdaisysynthadapter } from './daisy/daisysynthadapter'
import { isdaisysynthenabled, ismaxisynthenabled } from './daisy/flags'
import { bootwasmsynth } from './wasm/bootwasmsynth'
import { createwasmsynthadapter } from './wasmsynthadapter'

export async function createsynthbackend(): Promise<SynthBackend> {
  if (ismaxisynthenabled() || !isdaisysynthenabled()) {
    return createwasmsynthadapter(await bootwasmsynth())
  }
  return createdaisysynthadapter(await bootdaisysynth())
}

export { createwasmsynthadapter } from './wasmsynthadapter'
export { createdaisysynthadapter } from './daisy/daisysynthadapter'
