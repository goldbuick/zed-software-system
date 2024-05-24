import { maptostring } from 'zss/chip'
import { tape_info } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'

function writeheader(header: string) {
  const bar = '-'.repeat(header.length + 4)
  tape_info('cli', `$green=${bar}=`)
  tape_info('cli', `$green $4$white ${header} $green$4 `)
  tape_info('cli', `$green=${bar}=`)
}

function writeoption(option: string, label: string) {
  tape_info('cli', `$white#${option} $blue$26 ${label}`)
}

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
    const text = words.map(maptostring).join('')
    tape_info('cli', 'player>', label, input, text)
    return 0
  })
  .command('help', () => {
    writeheader('H E L P')
    writeoption('1', 'zss controls and inputs')
    writeoption('2', 'text formatting')
    writeoption('3', 'edit commands')
    writeoption('4', 'player settings')
    return 0
  })
  .command('1', () => {
    writeheader('zss controls and inputs')
    return 0
  })
  .command('2', () => {
    writeheader('text formatting')
    return 0
  })
  .command('3', () => {
    writeheader('edit commands')
    return 0
  })
  .command('4', () => {
    writeheader('player settings')
    return 0
  })
