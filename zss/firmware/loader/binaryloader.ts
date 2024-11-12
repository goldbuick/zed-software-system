import { FIRMWARE_COMMAND } from 'zss/firmware'
import { ARG_TYPE, readargs } from 'zss/firmware/wordtypes'
import { isnumber, ispresent, isstring, MAYBE_NUMBER } from 'zss/mapping/types'

function readbin(memory: CHIP_MEMORY, kind: string): MAYBE_NUMBER {
  if (!ispresent(memory.binaryfile)) {
    return undefined
  }

  const lkind = kind.toLowerCase()
  const le = lkind.endsWith('le')
  switch (lkind) {
    case 'float32':
    case 'float32le': {
      const value = memory.binaryfile.dataview.getFloat32(
        memory.binaryfile.cursor,
        le,
      )
      memory.binaryfile.cursor += 4
      return value
    }
    case 'float64':
    case 'float64le': {
      const value = memory.binaryfile.dataview.getFloat64(
        memory.binaryfile.cursor,
        le,
      )
      memory.binaryfile.cursor += 8
      return value
    }
    case 'int8':
    case 'int8le': {
      const value = memory.binaryfile.dataview.getInt8(memory.binaryfile.cursor)
      memory.binaryfile.cursor += 1
      return value
    }
    case 'int16':
    case 'int16le': {
      const value = memory.binaryfile.dataview.getInt16(
        memory.binaryfile.cursor,
        le,
      )
      memory.binaryfile.cursor += 2
      return value
    }
    case 'int32':
    case 'int32le': {
      const value = memory.binaryfile.dataview.getInt32(
        memory.binaryfile.cursor,
        le,
      )
      memory.binaryfile.cursor += 4
      return value
    }
    case 'int64':
    case 'int64le': {
      const value = memory.binaryfile.dataview.getBigInt64(
        memory.binaryfile.cursor,
        le,
      )
      memory.binaryfile.cursor += 8
      return value as any
    }
    case 'uint8':
    case 'uint8le': {
      const value = memory.binaryfile.dataview.getUint8(
        memory.binaryfile.cursor,
      )
      memory.binaryfile.cursor += 1
      return value
      break
    }
    case 'uint16':
    case 'uint16le': {
      const value = memory.binaryfile.dataview.getUint16(
        memory.binaryfile.cursor,
        le,
      )
      memory.binaryfile.cursor += 2
      return value
    }
    case 'uint32':
    case 'uint32le': {
      const value = memory.binaryfile.dataview.getUint32(
        memory.binaryfile.cursor,
        le,
      )
      memory.binaryfile.cursor += 4
      return value
    }
    case 'uint64':
    case 'uint64le': {
      const value = memory.binaryfile.dataview.getBigUint64(
        memory.binaryfile.cursor,
        le,
      )
      memory.binaryfile.cursor += 8
      return value as any
    }
  }
}

export const binaryloader: FIRMWARE_COMMAND = (chip, words) => {
  const memory = memoryreadchip(chip.id())
  if (!ispresent(memory.binaryfile)) {
    return 0
  }
  const [kind] = readargs(memoryreadcontext(chip, words), 0, [ARG_TYPE.STRING])

  const lkind = kind.toLowerCase()
  switch (lkind) {
    case 'seek': {
      const [cursor] = readargs(memoryreadcontext(chip, words), 1, [
        ARG_TYPE.NUMBER,
      ])
      memory.binaryfile.cursor = cursor
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
      const [target] = readargs(memoryreadcontext(chip, words), 1, [
        ARG_TYPE.STRING,
      ])
      chip.set(target, readbin(memory, lkind))
      break
    }
    case 'text': {
      const [lengthkind, target] = readargs(memoryreadcontext(chip, words), 1, [
        ARG_TYPE.STRING,
        ARG_TYPE.STRING,
      ])
      const length = readbin(memory, lengthkind)
      if (isnumber(length) && isstring(target)) {
        const bytes = new Uint8Array(
          memory.binaryfile.bytes.buffer,
          memory.binaryfile.cursor,
          length,
        )
        // Using decode method to get string output
        const decoder = new TextDecoder('utf-8')
        const value = decoder.decode(bytes)
        chip.set(target, value)
        memory.binaryfile.cursor += length
      }
      break
    }
  }
  return 0
}
