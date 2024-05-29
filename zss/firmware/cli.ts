import { maptostring } from 'zss/chip'
import { tape_debug, tape_info } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { memoryreadbooklist } from 'zss/memory'

const COLOR_EDGE = '$dkpurple'

const CHR_TM = '$196'

const CHR_LM = '$204'
const CHR_LA = '$199'

const CHR_SD = '$186'
const CHR_BM = '$205'

function fg(color: string, text: string) {
  return `$${color}${text}$blue`
}

function bg(color: string, text: string) {
  return `$${color}${text}$ondkblue`
}

function writeheader(header: string) {
  const CHR_TBAR = CHR_TM.repeat(header.length + 2)
  const CHR_BBAR = CHR_BM.repeat(header.length + 3)
  tape_info('cli', `${COLOR_EDGE}${CHR_SD} `)
  tape_info('cli', `${COLOR_EDGE}${CHR_LA}${CHR_TBAR}`)
  tape_info('cli', `${COLOR_EDGE}${CHR_SD} $white${header}`)
  tape_info('cli', `${COLOR_EDGE}${CHR_LM}${CHR_BBAR}`)
}

function writesection(section: string) {
  const CHR_BBAR = CHR_BM.repeat(section.length + 2)
  tape_info('cli', `${COLOR_EDGE}${CHR_SD} `)
  tape_info('cli', `${COLOR_EDGE}${CHR_SD} $gray${section}`)
  tape_info('cli', `${COLOR_EDGE}${CHR_LM}${CHR_BBAR}`)
}

function writeoption(option: string, label: string) {
  tape_info('cli', `${COLOR_EDGE}${CHR_SD} $white${option} $blue${label}`)
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
    writeheader(`H E L P`)
    writeoption(`#1`, `zss controls and inputs`)
    writeoption(`#2`, `text formatting`)
    writeoption(`#3`, `edit commands`)
    writeoption(`#4`, `player settings`)
    writesection(`keyboard input`)
    writeoption(`?`, `open console`)
    writeoption(`esc`, `close console`)
    writeoption(`tab`, `move console`)
    writeoption(`up / down arrow keys`, `navigate console items`)
    writeoption(`left / right arrow keys`, `change console items`)
    writeoption(`enter`, `interact with console items`)
    writeoption(`alt + arrow keys`, `skip words and console lines`)
    writeoption(`${metakey} + up / down arrow keys`, `input history`)
    return 0
  })
  .command('1', () => {
    writeheader(`zss controls and inputs`)
    writesection(`keyboard input`)
    writeoption(`arrow keys`, `move`)
    writeoption(`shift + arrow keys`, `shoot`)
    writeoption(`enter`, `ok / accept`)
    writeoption(`escape`, `cancel / close`)
    writeoption(`tab`, `menu / action`)
    writesection(`mouse input`)
    writetext(`todo ???`)
    writesection(`controller input`)
    writeoption(`left stick`, `move`)
    writeoption(`right stick`, `aim`)
    writeoption(`a`, `ok / accept`)
    writeoption(`b`, `cancel / close`)
    writeoption(`y`, `menu / action`)
    writeoption(`x`, `shoot`)
    writeoption(`triggers`, `shoot`)
    return 0
  })
  .command('2', () => {
    writeheader(`text formatting`)
    writesection(`typography`)
    writetext(`plain text`)
    writetext(`$centering text`)
    writetext(`"\\"@quoted strings for special chars\\""`)
    writetext(`$$0-255 for ascii chars $159$176$240`)
    writetext(
      `use color names like ${fg('red', '$$red')} to change foreground color`,
    )
    writetext(
      `use color names like ${bg('ongreen', '$$ongreen')} to change background color`,
    )
    writetext(`use clear ${bg('clear', 'to change background to')} transparent`)
    writesection(`hypertext`)
    writetext(
      `${fg('white', '"!hotkey"')} message shortcut;${fg('gray', 'Label')}`,
    )
    writetext(
      `${fg('white', '"!range"')} flag [labelmin] [labelmax];${fg('gray', 'Input Label')}`,
    )
    writetext(
      `${fg('white', '"!select"')} flag ...list of values;${fg('gray', 'Input Label')}`,
    )
    writetext(
      `${fg('white', '"!number"')} flag [minvalue] [maxvalue];${fg('gray', 'Input Label')}`,
    )
    writetext(`${fg('white', '"!text"')} flag;${fg('gray', 'Input Label')}`)
    return 0
  })
  .command('3', () => {
    writeheader(`edit commands`)
    writeoption(`#books`, `list books in memory`)
    return 0
  })
  .command('books', () => {
    writeheader(`books`)
    const list = memoryreadbooklist()
    if (list.length) {
      list.forEach((book) => {
        writetext(`!bookopen ${book.id};${book.name}`)
      })
    } else {
      writetext(`no books found`)
    }
    writetext(`!bookcreate;create a new book`)
    return 0
  })
  .command('4', () => {
    writeheader(`player settings`)
    writetext(`todo`)
    return 0
  })
  .command('send', (chip, args) => {
    tape_debug('cli', JSON.stringify(args))
    return 0
  })
