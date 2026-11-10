import {
  DYNAMICS_VET_SONG_ID,
  builddynamicsvetplaysequence,
  dynamicsvetfullscenario,
  dynamicsvetmeta,
  dynamicsvetnocompscenario,
  dynamicsvetnoscenario,
} from 'zss/feature/synth/backend/daisy/dynamicsvettingsong'
import { filterlevelstabilityscenarios } from 'zss/feature/synth/backend/daisy/levelstabilityscenarios'

describe('dynamicsvettingsong', () => {
  it('expands the board #repeat structure into 180 play lines', () => {
    const plays = builddynamicsvetplaysequence()
    expect(plays).toHaveLength(180)
    expect(plays[0]).toBe('--sdxb#xaxfx')
    expect(plays[plays.length - 1]).toBe('--sdxgxqabghb#')
  })

  it('registers full / sc-off / comp-off scenarios under dynamics-vet filter', () => {
    const meta = dynamicsvetmeta()
    expect(meta.id).toBe(DYNAMICS_VET_SONG_ID)
    expect(meta.estimateddurationsec).toBeGreaterThan(60)

    const full = dynamicsvetfullscenario()
    const nosc = dynamicsvetnoscenario()
    const nocomp = dynamicsvetnocompscenario()
    expect(full.sidechainbypass).toBeUndefined()
    expect(nosc.sidechainbypass).toBe(true)
    expect(nocomp.maincompbypass).toBe(true)

    const filtered = filterlevelstabilityscenarios('dynamics-vet')
    expect(filtered.map((s) => s.id).sort()).toEqual(
      [full.id, nocomp.id, nosc.id].sort(),
    )
  })
})
