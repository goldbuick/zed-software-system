import { TEXT_READER } from 'zss/device/api'
import { FIRMWARE_COMMAND } from 'zss/firmware'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { memoryloadercontent } from 'zss/memory/loader'
import { readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

/** Inclusive EOF index: cursor may equal lines.length. */
function cursormax(textreader: TEXT_READER) {
  return textreader.lines.length
}

function iseof(textreader: TEXT_READER) {
  return textreader.cursor >= textreader.lines.length
}

function advancecursor(textreader: TEXT_READER) {
  textreader.cursor = clamp(textreader.cursor + 1, 0, cursormax(textreader))
}

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
      textreader.cursor = clamp(cursor, 0, cursormax(textreader))
      break
    }
    case 'next':
      advancecursor(textreader)
      break
    default: {
      // pattern + capture names; does not advance (use #readline next)
      if (iseof(textreader)) {
        for (let i = ii; i < words.length; ) {
          const [name, next] = readargs(words, i, [ARG_TYPE.NAME])
          chip.set(name, '')
          i = next
        }
        break
      }
      const line = textreader.lines[textreader.cursor] ?? ''
      const regex = new RegExp(kind, 'i')
      const result = regex.exec(line) ?? []
      let m = 1
      for (let i = ii; i < words.length; ) {
        const [name, next] = readargs(words, i, [ARG_TYPE.NAME])
        chip.set(name, result[m] ?? 0)
        ++m
        i = next
      }
      break
    }
  }
  return 0
}
