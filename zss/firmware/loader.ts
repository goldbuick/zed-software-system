import { maptostring } from 'zss/chip'
import { tape_info } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { memoryreadchip, memoryreadcontext } from 'zss/memory'

import { ARG_TYPE, readargs } from './wordtypes'

export const LOADER_FIRMWARE = createfirmware({
  get(chip, name) {
    // read loader state
    const memory = memoryreadchip(chip.id())
    if (!ispresent(memory)) {
      return [false, undefined]
    }

    switch (name.toLowerCase()) {
      case 'filename':
        break
    }

    return [false, undefined]
  },
  set(chip, name, value) {
    return [false, undefined]
  },
  shouldtick(chip, activecycle) {
    //
  },
  tick(chip) {
    //
  },
  tock(chip) {
    //
  },
})
  .command('stat', () => {
    // no-op
    return 0
  })
  .command('text', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const text = words.map(maptostring).join(' ')
    tape_info('$2', `${memory.player}: ${text}`)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    const memory = memoryreadchip(chip.id())
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    const hyperlink = words.map(maptostring).join(' ')
    tape_info('$2', `!${hyperlink};${memory.player}: ${label}`)
    return 0
  })
  .command('binary', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [kind, name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.STRING,
    ])
    const lname = name.toLowerCase()
    switch (kind.toLowerCase()) {
      case 'float32':
        chip.set(
          lname,
          memory.binaryfile?.dataview.getFloat32(
            (memory.binaryfile.offset += 4),
          ),
        )
        break
      case 'float64':
        chip.set(
          lname,
          memory.binaryfile?.dataview.getFloat64(
            (memory.binaryfile.offset += 8),
          ),
        )
        break
      case 'int8':
        chip.set(
          lname,
          memory.binaryfile?.dataview.getInt8((memory.binaryfile.offset += 1)),
        )
        break
      case 'int16':
        chip.set(
          lname,
          memory.binaryfile?.dataview.getInt16((memory.binaryfile.offset += 2)),
        )
        break
      case 'int32':
        chip.set(
          lname,
          memory.binaryfile?.dataview.getInt32((memory.binaryfile.offset += 4)),
        )
        break
      case 'int63':
        chip.set(
          lname,
          memory.binaryfile?.dataview.getBigInt64(
            (memory.binaryfile.offset += 8),
          ),
        )
        break
      case 'uint8':
        chip.set(
          lname,
          memory.binaryfile?.dataview.getUint8((memory.binaryfile.offset += 1)),
        )
        break
      case 'uint16':
        chip.set(
          lname,
          memory.binaryfile?.dataview.getUint16(
            (memory.binaryfile.offset += 2),
          ),
        )
        break
      case 'uint32':
        chip.set(
          lname,
          memory.binaryfile?.dataview.getUint32(
            (memory.binaryfile.offset += 4),
          ),
        )
        break
      case 'uint63':
        chip.set(
          lname,
          memory.binaryfile?.dataview.getBigUint64(
            (memory.binaryfile.offset += 8),
          ),
        )
        break
    }
    return 0
  })
  .command('send', (chip, words) => {
    const [msg, data] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.ANY,
    ])
    tape_info('$2', `${msg} ${data ?? ''}`)
    return 0
  })
