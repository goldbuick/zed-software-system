import {
  CLASSIFIER_ESTIMATE_BYTES,
  GEMMA_ESTIMATE_BYTES,
  GPU_HEADROOM_BYTES,
  type GPU_RESIDENCY,
  MOONSHINE_ESTIMATE_BYTES,
} from 'zss/feature/gpu/gpupolicy'

type GpuAdapterLimits = {
  maxBufferSize: number
}

type GpuAdapter = {
  limits: GpuAdapterLimits
}

type GpuNavigator = Navigator & {
  gpu?: {
    requestAdapter: () => Promise<GpuAdapter | null>
  }
}

let residencymode: GPU_RESIDENCY = 'exclusive'
let budgetready = false
let budgetpromise: Promise<GPU_RESIDENCY> | undefined

function combinedmodelbytes(): number {
  return (
    GEMMA_ESTIMATE_BYTES + CLASSIFIER_ESTIMATE_BYTES + MOONSHINE_ESTIMATE_BYTES
  )
}

function adapterbudgetbytes(limits: GpuAdapterLimits): number {
  return limits.maxBufferSize
}

export function getgpuresidencymode(): GPU_RESIDENCY {
  return residencymode
}

export async function initgpumodelbudget(): Promise<GPU_RESIDENCY> {
  if (budgetready) {
    return residencymode
  }
  if (budgetpromise) {
    return budgetpromise
  }

  budgetpromise = (async () => {
    residencymode = 'exclusive'
    const gpu = (navigator as GpuNavigator).gpu
    if (!gpu) {
      budgetready = true
      budgetpromise = undefined
      return residencymode
    }
    try {
      const adapter = await gpu.requestAdapter()
      if (!adapter) {
        budgetready = true
        budgetpromise = undefined
        return residencymode
      }
      const limit = adapterbudgetbytes(adapter.limits)
      const needed = combinedmodelbytes() + GPU_HEADROOM_BYTES
      residencymode = limit >= needed ? 'dual' : 'exclusive'
    } catch {
      residencymode = 'exclusive'
    }
    budgetready = true
    budgetpromise = undefined
    return residencymode
  })()

  return budgetpromise
}

export function canresidentboth(): boolean {
  return residencymode === 'dual'
}
