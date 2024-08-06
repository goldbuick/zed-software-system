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
  .command('binary:float32', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])
    const lname = name.toLowerCase()
    chip.set(
      lname,
      memory.binaryfile?.dataview.getFloat32((memory.binaryfile.offset += 4)),
    )
    return 0
  })
  .command('binary:float64', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])
    const lname = name.toLowerCase()
    chip.set(
      lname,
      memory.binaryfile?.dataview.getFloat64((memory.binaryfile.offset += 8)),
    )
    return 0
  })
  .command('binary:int8', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])
    const lname = name.toLowerCase()
    chip.set(
      lname,
      memory.binaryfile?.dataview.getInt8(memory.binaryfile.offset++),
    )
    return 0
  })
  .command('binary:int16', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])
    const lname = name.toLowerCase()
    chip.set(
      lname,
      memory.binaryfile?.dataview.getInt8(memory.binaryfile.offset++),
    )
    return 0
  })
  .command('binary:int32', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])
    const lname = name.toLowerCase()
    chip.set(
      lname,
      memory.binaryfile?.dataview.getInt8(memory.binaryfile.offset++),
    )

    return 0
  })
  .command('binary:int64', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])
    const lname = name.toLowerCase()
    chip.set(
      lname,
      memory.binaryfile?.dataview.getInt8(memory.binaryfile.offset++),
    )

    return 0
  })
  .command('binary:uint8', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])
    const lname = name.toLowerCase()
    chip.set(
      lname,
      memory.binaryfile?.dataview.getInt8(memory.binaryfile.offset++),
    )

    return 0
  })
  .command('binary:uint16', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])
    const lname = name.toLowerCase()
    chip.set(
      lname,
      memory.binaryfile?.dataview.getInt8(memory.binaryfile.offset++),
    )

    return 0
  })
  .command('binary:uint32', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])
    const lname = name.toLowerCase()
    chip.set(
      lname,
      memory.binaryfile?.dataview.getInt8(memory.binaryfile.offset++),
    )

    return 0
  })
  .command('binary:uint64', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
    ])
    const lname = name.toLowerCase()
    chip.set(
      lname,
      memory.binaryfile?.dataview.getInt8(memory.binaryfile.offset++),
    )

    return 0
  })
