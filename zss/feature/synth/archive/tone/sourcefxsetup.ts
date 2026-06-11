import { Volume } from 'tone'
import { ispresent } from 'zss/mapping/types'

import { createfx } from './fx'
import { createfxchannels } from './fxchannels'
import { SOURCE_TYPE, createsource } from './source'

export type SOURCE_FX_SETUP = ReturnType<typeof createsourcefxsetup>

export function createsourcefxsetup(
  playvolume: Volume,
  bgplayvolume: Volume,
  ttsvolume: Volume,
) {
  const SOURCE = [
    createsource(SOURCE_TYPE.SYNTH, 0),
    createsource(SOURCE_TYPE.SYNTH, 0),
    createsource(SOURCE_TYPE.SYNTH, 0),
    createsource(SOURCE_TYPE.SYNTH, 0),
    createsource(SOURCE_TYPE.SYNTH, 0),
    createsource(SOURCE_TYPE.SYNTH, 0),
    createsource(SOURCE_TYPE.SYNTH, 0),
    createsource(SOURCE_TYPE.SYNTH, 0),
  ]

  const FXCHAIN = createfx()
  const FX = [createfxchannels(1), createfxchannels(2)]

  function connectfxgroupoutputs(f: (typeof FX)[0], ...dests: Volume[]) {
    for (let d = 0; d < dests.length; ++d) {
      const dest = dests[d]
      f.sendtofx.connect(dest)
      f.fc.chain(FXCHAIN.fc, dest)
      f.echo.chain(FXCHAIN.echo, dest)
      f.reverb.chain(FXCHAIN.reverb, dest)
      f.autofilter.chain(FXCHAIN.autofilter, dest)
      f.vibrato.chain(FXCHAIN.vibrato, dest)
      f.distortion.chain(FXCHAIN.distortion, dest)
      f.autowah.chain(FXCHAIN.autowah, dest)
    }
  }

  connectfxgroupoutputs(FX[0], playvolume)
  connectfxgroupoutputs(FX[1], bgplayvolume, ttsvolume)

  function mapindextofx(index: number) {
    return index < 4 ? 0 : 1
  }

  function connectsource(index: number) {
    const f = mapindextofx(index)
    if (!ispresent(SOURCE[index])) {
      return
    }

    switch (SOURCE[index].source.type) {
      case SOURCE_TYPE.RETRO_NOISE:
      case SOURCE_TYPE.BUZZ_NOISE:
      case SOURCE_TYPE.CLANG_NOISE:
      case SOURCE_TYPE.METALLIC_NOISE:
        break
      default:
        SOURCE[index].source.synth.connect(FX[f].sendtofx)
        break
    }

    switch (SOURCE[index].source.type) {
      case SOURCE_TYPE.RETRO_NOISE:
      case SOURCE_TYPE.BUZZ_NOISE:
      case SOURCE_TYPE.CLANG_NOISE:
      case SOURCE_TYPE.METALLIC_NOISE:
        SOURCE[index].source.synth.chain(
          SOURCE[index].source.filter1,
          SOURCE[index].source.filter2,
          FX[f].sendtofx,
        )
        break
      case SOURCE_TYPE.BELLS:
        SOURCE[index].source.sparkle.connect(FX[f].sendtofx)
        break
    }
  }

  for (let i = 0; i < SOURCE.length; ++i) {
    connectsource(i)
  }

  function changesource(index: number, type: SOURCE_TYPE, algo: number) {
    const currentalgo =
      SOURCE[index]?.source.type === SOURCE_TYPE.ALGO_SYNTH
        ? SOURCE[index]?.source.algo
        : 0
    if (SOURCE[index]?.source.type === type && currentalgo === algo) {
      return
    }
    SOURCE[index]?.source.synth.dispose()
    SOURCE[index] = createsource(type, algo)
    connectsource(index)
  }

  return {
    SOURCE,
    FX,
    FXCHAIN,
    mapindextofx,
    connectsource,
    changesource,
  }
}
