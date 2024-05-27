import { maptostring } from 'zss/chip'
import { tape_info } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'

const COLOR_EDGE = '$dkpurple'

const CHR_TM = '$196'

const CHR_LM = '$204'
const CHR_LA = '$199'

const CHR_SD = '$186'
const CHR_BM = '$205'

function writeheader(header: string) {
  const CHR_TBAR = CHR_TM.repeat(header.length + 2)
  const CHR_BBAR = CHR_BM.repeat(header.length + 3)
  tape_info('cli', `${COLOR_EDGE}${CHR_SD} `)
  tape_info('cli', `${COLOR_EDGE}${CHR_LA}${CHR_TBAR}`)
  tape_info('cli', `${COLOR_EDGE}${CHR_SD}$white ${header}`)
  tape_info('cli', `${COLOR_EDGE}${CHR_LM}${CHR_BBAR}`)
}

function writesection(section: string) {
  const CHR_BBAR = CHR_BM.repeat(section.length + 2)
  tape_info('cli', `${COLOR_EDGE}${CHR_SD} `)
  tape_info('cli', `${COLOR_EDGE}${CHR_SD} $gray${section}`)
  tape_info('cli', `${COLOR_EDGE}${CHR_LM}${CHR_BBAR}`)
}

function writeoption(option: string, label: string) {
  tape_info('cli', `${COLOR_EDGE}${CHR_SD} $gray#${option} $blue${label}`)
}

function writetext(text: string) {
  tape_info('cli', `${COLOR_EDGE}${CHR_SD} $blue${text}`)
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
  shouldtick() {},
  tick() {},
  tock() {},
})
  .command('text', (_chip, words) => {
    // const memory = memoryreadchip(chip.id())
    const text = words.map(maptostring).join('')
    tape_info('cli', 'player>', text)
    return 0
  })
  .command('hyperlink', (_chip, args) => {
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
    writesection('keyboard input')
    writetext('?: open console')
    writetext('esc: close console')
    writetext('tab: move console')
    writetext('up / down arrow keys: input history')
    writetext('alt + up / down arrow keys: scroll console')
    return 0
  })
  .command('1', () => {
    writeheader('zss controls and inputs')
    writesection('keyboard input')
    writetext('arrow keys: move')
    writetext('shift + arrow keys: shoot')
    writetext('enter: ok / accept')
    writetext('escape: cancel / close')
    writetext('tab: menu / action')
    writesection('mouse input')
    writetext('todo ???')
    writesection('controller input')
    writetext('left stick: move')
    writetext('right stick: aim')
    writetext('a: ok / accept')
    writetext('b: cancel / close')
    writetext('y: menu / action')
    writetext('x: shoot')
    writetext('triggers: shoot')
    return 0
  })
  .command('2', () => {
    writeheader('text formatting')
    writesection('typography')
    writetext('---')
    writesection('ascii')
    writetext('---')
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
