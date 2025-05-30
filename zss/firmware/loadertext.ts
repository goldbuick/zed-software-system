import { TEXT_READER } from 'zss/device/api'
import { FIRMWARE_COMMAND } from 'zss/firmware'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { memoryloadercontent } from 'zss/memory/loader'
import { ARG_TYPE, readargs } from 'zss/words/reader'
import { NAME } from 'zss/words/types'

export const loadertext: FIRMWARE_COMMAND = (chip, words) => {
  const textreader: TEXT_READER = memoryloadercontent(chip.id())
  if (!ispresent(textreader)) {
    return 0
  }

  const [kind, ii] = readargs(words, 0, [ARG_TYPE.NAME])
  const lkind = NAME(kind)
  switch (lkind) {
    case 'seek': {
      const [cursor] = readargs(words, ii, [ARG_TYPE.NUMBER])
      textreader.cursor = clamp(cursor, 0, textreader.lines.length - 1)
      break
    }
    case 'line':
      textreader.cursor = clamp(
        textreader.cursor + 1,
        0,
        textreader.lines.length - 1,
      )
      break
    default: {
      // we have pattern + names for captures
      const line = textreader.lines[textreader.cursor] ?? ''
      const regex = new RegExp(kind, 'i')
      const result = regex.exec(line) ?? []
      let m = 1
      for (let i = ii; i < words.length; ) {
        // read next name to set
        const [name, next] = readargs(words, i, [ARG_TYPE.NAME])
        // set entry, set to zero if we failed the regex match
        chip.set(name, result[m] ?? 0)
        // next entry
        ++m
        i = next
      }
      break
    }
  }
  return 0
}
