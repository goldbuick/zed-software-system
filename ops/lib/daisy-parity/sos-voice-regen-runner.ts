import { SOS_VOICE_PATCHES } from 'zss/feature/synth/backend/daisy/sosvoicepatches'
import { rendersosvoicepatch } from 'zss/feature/synth/backend/daisy/sosvoicerender'

export async function runsosvoiceregen(args: {
  patchid?: string
}): Promise<Record<string, unknown>> {
  const patchid = args.patchid
  const out: Record<string, unknown> = {}

  if (patchid) {
    const patch = SOS_VOICE_PATCHES.find((item) => item.id === patchid)
    if (!patch) {
      throw new Error(`unknown sos patch ${patchid}`)
    }
    out[patchid] = await rendersosvoicepatch(patch)
    return out
  }

  for (const patch of SOS_VOICE_PATCHES) {
    out[patch.id] = await rendersosvoicepatch(patch)
  }
  return out
}
