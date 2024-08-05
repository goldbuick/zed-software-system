import { createfirmware } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { memoryreadchip } from 'zss/memory'

export const LOADER_FIRMWARE = createfirmware({
  get(chip, name) {
    // read loader state
    const memory = memoryreadchip(chip.id())
    if (!ispresent(memory)) {
      return [false, undefined]
    }

    switch (name.toLowerCase()) {
      case 'filename':
        break
    }

    return [false, undefined]
  },
  set(chip, name, value) {
    return [false, undefined]
  },
  shouldtick(chip, activecycle) {
    //
  },
  tick(chip) {
    //
  },
  tock(chip) {
    //
  },
})
  .command('loader', (chip, words) => {
    return 0
  })
  .command('stat', () => {
    // no-op
    return 0
  })
