import { FIRMWARE_COMMAND } from 'zss/firmware'
import { ARG_TYPE, readargs } from 'zss/firmware/wordtypes'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadchip, memoryreadcontext } from 'zss/memory'

export const binaryloader: FIRMWARE_COMMAND = (chip, words) => {
  const memory = memoryreadchip(chip.id())
  if (!ispresent(memory.binaryfile)) {
    return 0
  }
  const [kind] = readargs(memoryreadcontext(chip, words), 0, [ARG_TYPE.STRING])

  const lkind = kind.toLowerCase()

  let name = ''
  switch (lkind) {
    // skip odd balls
    case 'seek':
    case 'text':
      break
    // standard format + name
    default: {
      const [, target] = readargs(memoryreadcontext(chip, words), 0, [
        ARG_TYPE.STRING,
        ARG_TYPE.STRING,
      ])
      name = target
      break
    }
  }

  const le = lkind.endsWith('le')
  switch (lkind) {
    case 'seek': {
      const [, offset] = readargs(memoryreadcontext(chip, words), 0, [
        ARG_TYPE.STRING,
        ARG_TYPE.NUMBER,
      ])
      memory.binaryfile.offset = offset
      break
    }
    case 'float32':
    case 'float32le': {
      chip.set(
        name,
        memory.binaryfile.dataview.getFloat32(memory.binaryfile.offset, le),
      )
      memory.binaryfile.offset += 4
      break
    }
    case 'float64':
    case 'float64le': {
      chip.set(
        name,
        memory.binaryfile.dataview.getFloat64(memory.binaryfile.offset, le),
      )
      memory.binaryfile.offset += 8
      break
    }
    case 'int8':
    case 'int8le': {
      chip.set(
        name,
        memory.binaryfile.dataview.getInt8(memory.binaryfile.offset),
      )
      memory.binaryfile.offset += 1
      break
    }
    case 'int16':
    case 'int16le': {
      const value = memory.binaryfile.dataview.getInt16(
        memory.binaryfile.offset,
        le,
      )
      chip.set(name, value)
      memory.binaryfile.offset += 2
      break
    }
    case 'int32':
    case 'int32le': {
      chip.set(
        name,
        memory.binaryfile.dataview.getInt32(memory.binaryfile.offset, le),
      )
      memory.binaryfile.offset += 4
      break
    }
    case 'int64':
    case 'int64le': {
      chip.set(
        name,
        memory.binaryfile.dataview.getBigInt64(memory.binaryfile.offset, le),
      )
      memory.binaryfile.offset += 8
      break
    }
    case 'uint8':
    case 'uint8le': {
      chip.set(
        name,
        memory.binaryfile.dataview.getUint8(memory.binaryfile.offset),
      )
      memory.binaryfile.offset += 1
      break
    }
    case 'uint16':
    case 'uint16le': {
      chip.set(
        name,
        memory.binaryfile.dataview.getUint16(memory.binaryfile.offset, le),
      )
      memory.binaryfile.offset += 2
      break
    }
    case 'uint32':
    case 'uint32le': {
      chip.set(
        name,
        memory.binaryfile.dataview.getUint32(memory.binaryfile.offset, le),
      )
      memory.binaryfile.offset += 4
      break
    }
    case 'uint64':
    case 'uint64le': {
      chip.set(
        name,
        memory.binaryfile.dataview.getBigUint64(memory.binaryfile.offset, le),
      )
      memory.binaryfile.offset += 8
      break
    }
    case 'text': {
      const [, length, target] = readargs(memoryreadcontext(chip, words), 0, [
        ARG_TYPE.STRING,
        ARG_TYPE.NUMBER,
        ARG_TYPE.STRING,
      ])
      if (isnumber(length) && isstring(target)) {
        const bytes = new Uint8Array(
          memory.binaryfile.bytes.buffer,
          memory.binaryfile.offset,
          length,
        )
        // Using decode method to get string output
        const decoder = new TextDecoder('utf-8')
        const value = decoder.decode(bytes)
        chip.set(target, value)
        memory.binaryfile.offset += length
        console.info('text', length, target, value)
      }
      break
    }
  }
  return 0
}
