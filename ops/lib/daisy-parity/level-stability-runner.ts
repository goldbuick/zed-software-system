import { runlevelstabilitysuite } from 'zss/feature/synth/backend/daisy/daisylevelrender'
import {
  LEVEL_STABILITY_COMPARE_PAIRS,
  filterlevelstabilityscenarios,
} from 'zss/feature/synth/backend/daisy/levelstabilityscenarios'
import type { LEVEL_STABILITY_METRICS } from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'

export async function runlevelstabilitybrowser(args: {
  scenarioid?: string
  windowms?: number
}): Promise<{ metrics: Record<string, LEVEL_STABILITY_METRICS> }> {
  const scenarioid = args.scenarioid ?? 'all'
  const windowms = args.windowms ?? 46

  const scenarios = filterlevelstabilityscenarios(scenarioid)
  if (scenarios.length === 0) {
    throw new Error(`unknown scenario ${scenarioid}`)
  }
  if (scenarios.length > 1) {
    throw new Error('render one scenario per page load')
  }
  const scenario = scenarios[0]

  const result = await runlevelstabilitysuite(
    [scenario],
    LEVEL_STABILITY_COMPARE_PAIRS,
    windowms,
  )
  return { metrics: result.metrics }
}
