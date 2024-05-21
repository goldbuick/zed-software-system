import { maptostring } from 'zss/chip'
import { tape_info } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { memoryreadchip } from 'zss/memory'

export const CLI_FIRMWARE = createfirmware({
  get(chip, name) {
    // player chip ?
    return [false, undefined]
  },
  set(chip, name, value) {
    // player chip ?
    return [false, undefined]
  },
  shouldtick() {
    //
  },
  tick(chip) {
    //
  },
  tock(chip) {
    //
  },
})
  .command('text', (chip, words) => {
    // const memory = memoryreadchip(chip.id())
    const text = words.map(maptostring).join('')
    tape_info('cli', 'player>', text)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    // package into a panel item
    const [labelword, inputword, ...words] = args
    const label = maptostring(labelword)
    const input = maptostring(inputword)
    console.info('hyperlink', label, input, words)
    return 0
  })
