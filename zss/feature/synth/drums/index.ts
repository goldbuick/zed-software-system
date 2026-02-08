/* eslint-disable @typescript-eslint/unbound-method */
import { Volume } from 'tone'

import { createbass } from './bass'
import { createhihat } from './hihat'
import { createpercussion } from './percussion'
import { createsnare } from './snare'
import { createtom } from './tom'
import { createwoodblock } from './woodblock'

export function createsynthdrums(drumvolume: Volume, drumaction: Volume) {
  const hihat = createhihat(drumvolume)
  const percussion = createpercussion(drumvolume, drumaction)
  const snare = createsnare(drumvolume)
  const woodblock = createwoodblock(drumvolume)
  const tom = createtom(drumvolume)
  const bass = createbass(drumvolume, drumaction)

  return {
    ticktrigger: hihat.ticktrigger,
    tweettrigger: hihat.tweettrigger,
    cowbelltrigger: percussion.cowbelltrigger,
    claptrigger: percussion.claptrigger,
    hisnaretrigger: snare.hisnaretrigger,
    hiwoodblocktrigger: woodblock.hiwoodblocktrigger,
    lowsnaretrigger: snare.lowsnaretrigger,
    lowtomtrigger: tom.lowtomtrigger,
    lowwoodblocktrigger: woodblock.lowwoodblocktrigger,
    basstrigger: bass.basstrigger,
  }
}
