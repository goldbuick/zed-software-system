import { findlevelstabilityscenario } from './levelstabilityscenarios'
import type { LEVEL_STABILITY_SCENARIO } from './levelstabilitytypes'

/** Sustained play + bgplay stab — isolates sidechain duck (see duck-bg-stab). */
export const SIDECHAIN_SCENARIO_ID = 'duck-bg-stab'

export function sidechainabscenario(): LEVEL_STABILITY_SCENARIO {
  const base = findlevelstabilityscenario(SIDECHAIN_SCENARIO_ID)
  if (!base) {
    throw new Error(`missing level stability scenario ${SIDECHAIN_SCENARIO_ID}`)
  }
  return { ...base }
}
