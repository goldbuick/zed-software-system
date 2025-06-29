type ZZT_ELEMENT = {
  element: number
  color: number
}

export function parsezzt(player: string, content: Uint8Array) {
  let cursor = 0
  const reader = new DataView(content.buffer)

  function readuint8() {
    const value = reader.getUint8(cursor)
    cursor++
    return value
  }

  function readint16() {
    const value = reader.getInt16(cursor, true)
    cursor += 2
    return value
  }

  function readint32() {
    const value = reader.getInt32(cursor, true)
    cursor += 4
    return value
  }

  function readstring(count: number) {
    let str = ''
    const data = content.subarray(cursor, cursor + count)
    for (let i = 0; i < data.length; ++i) {
      str += String.fromCharCode(data[i])
    }
    cursor += count
    return str.replace('\r', '\n')
  }

  // read world

  const worldfileid = readint16()
  if (worldfileid != -1) {
    return
  }

  const numberofboards = readint16()
  const playerammo = readint16()
  const playergems = readint16()
  const keys = readstring(7)
  const playerhealth = readint16()
  const playerboard = readint16()
  const playertorches = readint16()
  const torchcycles = readint16()
  const energycycles = readint16()
  readint16() // skip
  const playerscore = readint16()
  const worldnamelength = readuint8()
  const worldname = readstring(20).slice(0, worldnamelength)

  const flags: string[] = []
  for (let i = 0; i < 9; i++) {
    const flagnamelength = readuint8()
    const flagname = readstring(20).slice(0, flagnamelength)
    flags.push(flagname)
  }

  const timepassed = readint16()
  const timepassedticks = readint16()
  const locked = readuint8()

  // read boards
  cursor = 512 // skip bytes

  for (let i = 0; i < numberofboards; ++i) {
    const boardsize = readint16()
    const start = cursor
    const boardnamelength = readuint8()
    const boardname = readstring(50).slice(0, boardnamelength)
    console.info('board', boardname)

    // read board elements
    const elements: ZZT_ELEMENT[] = []
    while (elements.length < 1500) {
      let count = readuint8()
      if (count === 0) {
        count = 255
      }
      const element = readuint8()
      const color = readuint8()
      for (let r = 0; r < count; ++r) {
        elements.push({ element, color })
      }
    }
    console.info(elements)

    // read board stats
    const maxplayershots = readuint8()
    const isdark = readuint8()
    const exitnorth = readuint8()
    const exitsouth = readuint8()
    const exitwest = readuint8()
    const exiteast = readuint8()
    const restartonzap = readuint8()
    const messagelength = readuint8()
    const message = readstring(58).slice(0, messagelength)
    const playerenterx = readuint8()
    const playerentery = readuint8()
    const timelimit = readint16()
    cursor += 16 // skip

    // read element stats
    const statcount = readint16()
    for (let s = 0; s < statcount; ++s) {
      const x = readuint8()
      const y = readuint8()
      const stepx = readint16()
      const stepy = readint16()
      const cycle = readint16()
      const p1 = readuint8()
      const p2 = readuint8()
      const p3 = readuint8()
      const Follower = readint16()
      const leader = readint16()
      const underelement = readuint8()
      const undercolor = readuint8()
      const pointer = readint32()
      const currentinstruction = readint16()
      const length = readint16()
      cursor += 8 // skip
      if (length < 0) {
        // copy code from
      } else {
        // read code in
        const code = readstring(length)
        console.info(code)
      }
    }

    cursor = start + boardsize
  }
}
