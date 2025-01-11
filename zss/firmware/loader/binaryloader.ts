import { FIRMWARE_COMMAND } from 'zss/firmware'
import {
  CHAR_HEIGHT,
  CHAR_WIDTH,
  CHARS_PER_ROW,
  CHARS_TOTAL_ROWS,
  PALETTE_COLORS,
  PALETTE_RGB,
} from 'zss/gadget/data/types'
import { isnumber, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { memoryloadercontent } from 'zss/memory/loader'
import { BINARY_READER } from 'zss/memory/types'
import { ARG_TYPE, readargs } from 'zss/words/reader'
import { NAME } from 'zss/words/types'

function readbin(binaryreader: BINARY_READER, kind: string): MAYBE<number> {
  if (!ispresent(binaryreader)) {
    return undefined
  }

  const lkind = NAME(kind)
  const le = lkind.endsWith('le')
  switch (lkind) {
    case 'float32':
    case 'float32le': {
      const value = binaryreader.dataview.getFloat32(binaryreader.cursor, le)
      binaryreader.cursor += 4
      return value
    }
    case 'float64':
    case 'float64le': {
      const value = binaryreader.dataview.getFloat64(binaryreader.cursor, le)
      binaryreader.cursor += 8
      return value
    }
    case 'int8':
    case 'int8le': {
      const value = binaryreader.dataview.getInt8(binaryreader.cursor)
      binaryreader.cursor += 1
      return value
    }
    case 'int16':
    case 'int16le': {
      const value = binaryreader.dataview.getInt16(binaryreader.cursor, le)
      binaryreader.cursor += 2
      return value
    }
    case 'int32':
    case 'int32le': {
      const value = binaryreader.dataview.getInt32(binaryreader.cursor, le)
      binaryreader.cursor += 4
      return value
    }
    case 'int64':
    case 'int64le': {
      const value = binaryreader.dataview.getBigInt64(binaryreader.cursor, le)
      binaryreader.cursor += 8
      return value as any
    }
    case 'uint8':
    case 'uint8le': {
      const value = binaryreader.dataview.getUint8(binaryreader.cursor)
      binaryreader.cursor += 1
      return value
      break
    }
    case 'uint16':
    case 'uint16le': {
      const value = binaryreader.dataview.getUint16(binaryreader.cursor, le)
      binaryreader.cursor += 2
      return value
    }
    case 'uint32':
    case 'uint32le': {
      const value = binaryreader.dataview.getUint32(binaryreader.cursor, le)
      binaryreader.cursor += 4
      return value
    }
    case 'uint64':
    case 'uint64le': {
      const value = binaryreader.dataview.getBigUint64(binaryreader.cursor, le)
      binaryreader.cursor += 8
      return value as any
    }
  }
}

export const binaryloader: FIRMWARE_COMMAND = (chip, words) => {
  const binaryreader: BINARY_READER = memoryloadercontent(chip.id())
  if (!ispresent(binaryreader)) {
    return 0
  }
  const [kind, ii] = readargs(words, 0, [ARG_TYPE.NAME])
  const lkind = NAME(kind)
  switch (lkind) {
    case 'seek': {
      const [cursor] = readargs(words, ii, [ARG_TYPE.NUMBER])
      binaryreader.cursor = cursor
      break
    }
    case 'float32':
    case 'float32le':
    case 'float64':
    case 'float64le':
    case 'int8':
    case 'int8le':
    case 'int16':
    case 'int16le':
    case 'int32':
    case 'int32le':
    case 'int64':
    case 'int64le':
    case 'uint8':
    case 'uint8le':
    case 'uint16':
    case 'uint16le':
    case 'uint32':
    case 'uint32le':
    case 'uint64':
    case 'uint64le': {
      const [target] = readargs(words, ii, [ARG_TYPE.NAME])
      chip.set(target, readbin(binaryreader, lkind))
      break
    }
    case 'text': {
      const [lengthkind, target] = readargs(words, ii, [
        ARG_TYPE.NAME,
        ARG_TYPE.NAME,
      ])
      const length = readbin(binaryreader, lengthkind)
      if (isnumber(length) && isstring(target)) {
        const bytes = new Uint8Array(
          binaryreader.bytes.buffer,
          binaryreader.cursor,
          length,
        )
        // Using decode method to get string output
        const decoder = new TextDecoder('utf-8')
        const value = decoder.decode(bytes)
        chip.set(target, value)
        binaryreader.cursor += length
      }
      break
    }
    case 'palette': {
      const [target] = readargs(words, ii, [ARG_TYPE.NAME])
      const numberofbytes = PALETTE_RGB * PALETTE_COLORS
      //
      // x number of palette bytes into mem
      break
    }
    case 'charset': {
      const [target] = readargs(words, ii, [ARG_TYPE.NAME])
      const numberofbytes =
        CHARS_PER_ROW * CHAR_WIDTH * CHARS_TOTAL_ROWS * CHAR_HEIGHT
      //
      // x number of charset bytes into mem
      break
    }
  }
  return 0
}
