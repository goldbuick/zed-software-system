import { FIRMWARE_COMMAND } from 'zss/firmware'
import { ARG_TYPE, readargs } from 'zss/firmware/wordtypes'
import { isnumber, ispresent, isstring, MAYBE_NUMBER } from 'zss/mapping/types'
import { memoryreadbinaryfile } from 'zss/memory'
import { BINARY_READER } from 'zss/memory/types'

function readbin(binaryfile: BINARY_READER, kind: string): MAYBE_NUMBER {
  if (!ispresent(binaryfile)) {
    return undefined
  }

  const lkind = kind.toLowerCase()
  const le = lkind.endsWith('le')
  switch (lkind) {
    case 'float32':
    case 'float32le': {
      const value = binaryfile.dataview.getFloat32(binaryfile.cursor, le)
      binaryfile.cursor += 4
      return value
    }
    case 'float64':
    case 'float64le': {
      const value = binaryfile.dataview.getFloat64(binaryfile.cursor, le)
      binaryfile.cursor += 8
      return value
    }
    case 'int8':
    case 'int8le': {
      const value = binaryfile.dataview.getInt8(binaryfile.cursor)
      binaryfile.cursor += 1
      return value
    }
    case 'int16':
    case 'int16le': {
      const value = binaryfile.dataview.getInt16(binaryfile.cursor, le)
      binaryfile.cursor += 2
      return value
    }
    case 'int32':
    case 'int32le': {
      const value = binaryfile.dataview.getInt32(binaryfile.cursor, le)
      binaryfile.cursor += 4
      return value
    }
    case 'int64':
    case 'int64le': {
      const value = binaryfile.dataview.getBigInt64(binaryfile.cursor, le)
      binaryfile.cursor += 8
      return value as any
    }
    case 'uint8':
    case 'uint8le': {
      const value = binaryfile.dataview.getUint8(binaryfile.cursor)
      binaryfile.cursor += 1
      return value
      break
    }
    case 'uint16':
    case 'uint16le': {
      const value = binaryfile.dataview.getUint16(binaryfile.cursor, le)
      binaryfile.cursor += 2
      return value
    }
    case 'uint32':
    case 'uint32le': {
      const value = binaryfile.dataview.getUint32(binaryfile.cursor, le)
      binaryfile.cursor += 4
      return value
    }
    case 'uint64':
    case 'uint64le': {
      const value = binaryfile.dataview.getBigUint64(binaryfile.cursor, le)
      binaryfile.cursor += 8
      return value as any
    }
  }
}

export const binaryloader: FIRMWARE_COMMAND = (chip, words) => {
  const binaryfile = memoryreadbinaryfile(chip.id())
  if (!ispresent(binaryfile)) {
    return 0
  }
  const [kind] = readargs(words, 0, [ARG_TYPE.STRING])

  const lkind = kind.toLowerCase()
  switch (lkind) {
    case 'seek': {
      const [cursor] = readargs(words, 1, [ARG_TYPE.NUMBER])
      binaryfile.cursor = cursor
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
      const [target] = readargs(words, 1, [ARG_TYPE.STRING])
      chip.set(target, readbin(binaryfile, lkind))
      break
    }
    case 'text': {
      const [lengthkind, target] = readargs(words, 1, [
        ARG_TYPE.STRING,
        ARG_TYPE.STRING,
      ])
      const length = readbin(binaryfile, lengthkind)
      if (isnumber(length) && isstring(target)) {
        const bytes = new Uint8Array(
          binaryfile.bytes.buffer,
          binaryfile.cursor,
          length,
        )
        // Using decode method to get string output
        const decoder = new TextDecoder('utf-8')
        const value = decoder.decode(bytes)
        chip.set(target, value)
        binaryfile.cursor += length
      }
      break
    }
  }
  return 0
}
