import { renderwasmparitypatch } from 'ops/archive/synth/maxi/wasmparityrender'
import {
  renderdaisyparitydrumpatch,
  renderdaisyparityfxpatch,
  renderdaisyparitymainpatch,
  renderdaisyparitypatch,
} from 'ops/lib/daisy-parity/daisyparityrender'
import type { PARITY_AUDIO_METRICS } from 'ops/lib/daisy-parity/paritymetrics'
import {
  DRUM_PARITY_PATCHES,
  ENVELOPE_ADSR_PARITY_PATCHES,
  FX_PARITY_PATCHES,
  MAIN_DYNAMICS_PARITY_PATCHES,
  WASM_PARITY_PATCHES,
} from 'ops/lib/daisy-parity/paritypatches'
import {
  rendertoneparitydrumpatch,
  rendertoneparityfxpatch,
  rendertoneparitymainpatch,
  rendertoneparitypatch,
} from 'ops/lib/daisy-parity/toneparityrender'

export type PARITY_REGEN_KIND = 'voice' | 'drum' | 'fx' | 'main'
export type PARITY_REGEN_BACKEND = 'wasm' | 'tone' | 'daisy'

function findvoicepatch(id: string) {
  return (
    WASM_PARITY_PATCHES.find((item) => item.id === id) ??
    ENVELOPE_ADSR_PARITY_PATCHES.find((item) => item.id === id)
  )
}

async function renderpatch(
  id: string,
  patchkind: PARITY_REGEN_KIND,
  backend: PARITY_REGEN_BACKEND,
): Promise<PARITY_AUDIO_METRICS> {
  if (backend === 'tone') {
    if (patchkind === 'drum') {
      const patch = DRUM_PARITY_PATCHES.find((item) => item.id === id)
      if (!patch) {
        throw new Error(`unknown drum patch ${id}`)
      }
      return rendertoneparitydrumpatch(patch)
    }
    if (patchkind === 'fx') {
      const patch = FX_PARITY_PATCHES.find((item) => item.id === id)
      if (!patch) {
        throw new Error(`unknown fx patch ${id}`)
      }
      return rendertoneparityfxpatch(patch)
    }
    if (patchkind === 'main') {
      const patch = MAIN_DYNAMICS_PARITY_PATCHES.find((item) => item.id === id)
      if (!patch) {
        throw new Error(`unknown main patch ${id}`)
      }
      return rendertoneparitymainpatch(patch)
    }
    const patch = findvoicepatch(id)
    if (!patch) {
      throw new Error(`unknown voice patch ${id}`)
    }
    return rendertoneparitypatch(patch)
  }
  if (backend === 'daisy') {
    if (patchkind === 'drum') {
      const patch = DRUM_PARITY_PATCHES.find((item) => item.id === id)
      if (!patch) {
        throw new Error(`unknown drum patch ${id}`)
      }
      return renderdaisyparitydrumpatch(patch)
    }
    if (patchkind === 'fx') {
      const patch = FX_PARITY_PATCHES.find((item) => item.id === id)
      if (!patch) {
        throw new Error(`unknown fx patch ${id}`)
      }
      return renderdaisyparityfxpatch(patch)
    }
    if (patchkind === 'main') {
      const patch = MAIN_DYNAMICS_PARITY_PATCHES.find((item) => item.id === id)
      if (!patch) {
        throw new Error(`unknown main patch ${id}`)
      }
      return renderdaisyparitymainpatch(patch)
    }
    const patch = findvoicepatch(id)
    if (!patch) {
      throw new Error(`unknown voice patch ${id}`)
    }
    return renderdaisyparitypatch(patch)
  }
  if (patchkind === 'drum') {
    throw new Error('wasm drum regen not implemented')
  }
  if (patchkind === 'fx') {
    throw new Error('wasm fx regen not implemented')
  }
  const patch = findvoicepatch(id)
  if (!patch) {
    throw new Error(`unknown patch ${id}`)
  }
  return renderwasmparitypatch(patch)
}

export async function runparityregen(args: {
  patchid?: string
  kind?: PARITY_REGEN_KIND
  backend?: PARITY_REGEN_BACKEND
}): Promise<Record<string, PARITY_AUDIO_METRICS>> {
  const patchid = args.patchid
  const kind = args.kind ?? 'voice'
  const backend = args.backend ?? 'wasm'
  const out: Record<string, PARITY_AUDIO_METRICS> = {}

  if (patchid) {
    out[patchid] = await renderpatch(patchid, kind, backend)
    return out
  }

  for (const patch of WASM_PARITY_PATCHES) {
    out[patch.id] = await renderpatch(patch.id, 'voice', backend)
  }
  return out
}
