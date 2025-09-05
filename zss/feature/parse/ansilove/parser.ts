// Parser module for AnsiLove

import { display, validateOptions } from './display'
import { File } from './file'
import { FontModule } from './font'
import { PaletteModule } from './palette'
import { ScreenData } from './screendata'
import type {
  DisplayData,
  FileObj,
  ParsedData,
  RenderOptions,
  Sauce,
} from './types'

// ADF parser
function adf(bytes: Uint8Array, options: RenderOptions): ParsedData {
  const file = new File(bytes)
  file.getC() // Read version number

  const imageData = new ScreenData(80)
  imageData.palette = PaletteModule.adf(file)
  imageData.font = FontModule.font8x16x256(file, options)
  imageData.raw(file.read())

  return {
    imageData,
    sauce: file.sauce,
  }
}

// ANSI parser
function ans(bytes: Uint8Array, options: RenderOptions): ParsedData {
  const file = new File(bytes)
  let escaped = false
  let escapeCode = ''
  let j: number
  let code: number
  let values: number[]
  let columns: number
  const imageData = new ScreenData(80)
  let topOfScreen = 0
  let x = 1
  let y = 1
  let savedX: number | undefined
  let savedY: number | undefined
  let foreground = 7
  let background = 0
  let foreground24bit: Uint8Array | undefined
  let background24bit: Uint8Array | undefined
  let drawForeground: number
  let drawBackground: number
  let bold = false
  let blink = false
  let inverse = false
  let icecolors: number

  function resetAttributes(): void {
    foreground = 7
    background = 0
    foreground24bit = undefined
    background24bit = undefined
    bold = false
    blink = false
    inverse = false
  }

  function newLine(): void {
    x = 1
    if (y === 26 - 1) {
      ++topOfScreen
    } else {
      ++y
    }
  }

  function setPos(newX: number, newY: number): void {
    x = Math.min(columns, Math.max(1, newX))
    y = Math.min(26, Math.max(1, newY))
  }

  function getValues(): number[] {
    return escapeCode
      .substr(1, escapeCode.length - 2)
      .split(';')
      .map((value: string): number => {
        const parsedValue = Number.parseInt(value, 10)
        return Number.isNaN(parsedValue) ? 1 : parsedValue
      })
  }

  // Initialize columns and settings based on sauce
  if (file.sauce) {
    if (file.sauce.tInfo1 > 0) {
      columns = file.sauce.tInfo1
    } else {
      columns = 80
    }
    icecolors = file.sauce.flags & 1 || options.icecolors || 0

    switch (file.sauce.letterSpacing) {
      case 1:
        options.bits = '8'
        break
      case 2:
        options.bits = '9'
        break
    }

    switch (file.sauce.tInfoS) {
      case 'IBM VGA':
        options.font = '80x25'
        break
      case 'IBM VGA50':
        options.font = '80x50'
        break
      case 'Amiga Topaz 1':
        options.font = 'topaz500'
        break
      case 'Amiga Topaz 1+':
        options.font = 'topaz500+'
        break
      case 'Amiga Topaz 2':
        options.font = 'topaz'
        break
      case 'Amiga Topaz 2+':
        options.font = 'topaz+'
        break
      case 'Amiga P0T-NOoDLE':
        options.font = 'pot-noodle'
        break
      case 'Amiga MicroKnight':
        options.font = 'microknight'
        break
      case 'Amiga MicroKnight+':
        options.font = 'microknight+'
        break
      case 'Amiga mOsOul':
        options.font = 'mosoul'
        break
    }
  } else {
    if (options.mode === 'ced') {
      columns = 78
    } else {
      columns = 80
    }
    icecolors = options.icecolors || 0
  }

  imageData.columns = columns
  imageData.font = FontModule.preset(options.font || '80x25', options)

  switch (options.bits) {
    case 'ced':
      imageData.palette = PaletteModule.CED
      break
    case 'workbench':
      imageData.palette = PaletteModule.WORKBENCH
      break
    default:
      imageData.palette = PaletteModule.ANSI
  }

  while (!file.eof()) {
    code = file.get()
    if (escaped) {
      escapeCode += String.fromCharCode(code)
      if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
        escaped = false
        values = getValues()
        if (escapeCode.startsWith('[')) {
          switch (escapeCode.charAt(escapeCode.length - 1)) {
            case 'A':
              y = Math.max(1, y - values[0])
              break
            case 'B':
              y = Math.min(26 - 1, y + values[0])
              break
            case 'C':
              if (x === columns) {
                newLine()
              }
              x = Math.min(columns, x + values[0])
              break
            case 'D':
              x = Math.max(1, x - values[0])
              break
            case 'H':
              if (values.length === 1) {
                setPos(1, values[0])
              } else {
                setPos(values[1], values[0])
              }
              break
            case 'J':
              if (values[0] === 2) {
                x = 1
                y = 1
                imageData.reset()
              }
              break
            case 'K':
              for (j = x - 1; j < columns; ++j) {
                imageData.set(j, y - 1 + topOfScreen, 0, false, 0, 0)
              }
              break
            case 'm':
              for (j = 0; j < values.length; ++j) {
                if (values[j] >= 30 && values[j] <= 37) {
                  foreground = values[j] - 30
                  if (foreground24bit) {
                    foreground24bit = undefined
                  }
                } else if (values[j] >= 40 && values[j] <= 47) {
                  background = values[j] - 40
                  if (background24bit) {
                    background24bit = undefined
                  }
                } else {
                  switch (values[j]) {
                    case 0:
                      resetAttributes()
                      break
                    case 1:
                      bold = true
                      if (foreground24bit) {
                        foreground24bit = undefined
                      }
                      break
                    case 5:
                      blink = true
                      if (background24bit) {
                        background24bit = undefined
                      }
                      break
                    case 7:
                      inverse = true
                      break
                    case 22:
                      bold = false
                      break
                    case 25:
                      blink = false
                      break
                    case 27:
                      inverse = false
                      break
                  }
                }
              }
              break
            case 's':
              savedX = x
              savedY = y
              break
            case 't':
              if (values.length === 4) {
                switch (values[0]) {
                  case 0:
                    background24bit = new Uint8Array([
                      values[1],
                      values[2],
                      values[3],
                    ])
                    break
                  case 1:
                    foreground24bit = new Uint8Array([
                      values[1],
                      values[2],
                      values[3],
                    ])
                    break
                }
              }
              break
            case 'u':
              x = savedX || x
              y = savedY || y
              break
          }
        }
        escapeCode = ''
      }
    } else {
      switch (code) {
        case 10:
          newLine()
          break
        case 13:
          if (file.peek() === 0x0a) {
            file.read(1)
            newLine()
          }
          break
        case 26:
          break
        default:
          if (code === 27 && file.peek() === 0x5b) {
            escaped = true
          } else {
            if (options.mode === 'ced') {
              imageData.set(x - 1, y - 1 + topOfScreen, code, false, 1, 0)
            } else {
              if (inverse) {
                drawForeground = background
                drawBackground = foreground
              } else {
                drawForeground = foreground
                drawBackground = background
              }
              if (bold) {
                drawForeground += 8
              }
              if (blink && icecolors && !background24bit) {
                drawBackground += 8
              }
              if (foreground24bit || background24bit) {
                imageData.set(
                  x - 1,
                  y - 1 + topOfScreen,
                  code,
                  true,
                  foreground24bit || imageData.palette[drawForeground],
                  background24bit || imageData.palette[drawBackground],
                )
              } else {
                imageData.set(
                  x - 1,
                  y - 1 + topOfScreen,
                  code,
                  false,
                  drawForeground,
                  drawBackground,
                )
              }
            }
            if (++x === columns + 1) {
              newLine()
            }
          }
      }
    }
  }

  return {
    imageData,
    sauce: file.sauce,
  }
}

// ASCII parser
function asc(bytes: Uint8Array, options: RenderOptions): ParsedData {
  const file = new File(bytes)
  const imageData = new ScreenData(80)
  imageData.font = FontModule.preset(options.font || '80x25', options)
  imageData.palette = PaletteModule.ASC_PC

  let x = 0
  let y = 0

  while (!file.eof()) {
    const code = file.get()
    if (code === 13 && file.peek() === 10) {
      file.read(1)
      ++y
      x = 0
    } else if (code === 10) {
      ++y
      x = 0
    } else {
      imageData.set(x, y, code, false, 1, 0)
      if (++x === 80) {
        ++y
        x = 0
      }
    }
  }

  return {
    imageData,
    sauce: file.sauce,
  }
}

// BIN parser
function bin(bytes: Uint8Array, options: RenderOptions): ParsedData {
  const file = new File(bytes)
  const imageData = new ScreenData(options.columns || 160)
  imageData.font = FontModule.preset(options.font || '80x25', options)
  imageData.palette = PaletteModule.BIN
  imageData.raw(file.read())

  let icecolors: number
  if (file.sauce) {
    icecolors = file.sauce.flags & 1 || options.icecolors || 0

    switch (file.sauce.letterSpacing) {
      case 1:
        options.bits = '8'
        break
      case 2:
        options.bits = '9'
        break
    }

    switch (file.sauce.tInfoS) {
      case 'IBM VGA':
        options.font = '80x25'
        break
      case 'IBM VGA50':
        options.font = '80x50'
        break
      case 'Amiga Topaz 1':
        options.font = 'topaz500'
        break
      case 'Amiga Topaz 1+':
        options.font = 'topaz500+'
        break
      case 'Amiga Topaz 2':
        options.font = 'topaz'
        break
      case 'Amiga Topaz 2+':
        options.font = 'topaz+'
        break
      case 'Amiga P0T-NOoDLE':
        options.font = 'pot-noodle'
        break
      case 'Amiga MicroKnight':
        options.font = 'microknight'
        break
      case 'Amiga MicroKnight+':
        options.font = 'microknight+'
        break
      case 'Amiga mOsOul':
        options.font = 'mosoul'
        break
    }
  } else {
    icecolors = options.icecolors || 0
  }

  if (!icecolors) {
    const data = imageData.getData()
    for (let i = 1; i < data.length; i += 2) {
      data[i] = data[i] & 127
    }
  }

  return {
    imageData,
    sauce: file.sauce,
  }
}

// IDF parser
function idf(bytes: Uint8Array, options: RenderOptions): ParsedData {
  const file = new File(bytes)

  file.seek(8)
  const columns = file.get16() + 1

  const imageData = new ScreenData(columns)

  file.seek(12)

  let x = 0
  let y = 0
  while (file.getPos() < file.size - 4144) {
    const c = file.get16()
    if (c === 1) {
      let loop = file.get()
      file.get()
      const ch = file.get()
      const attr = file.get()
      while (loop-- > 0) {
        imageData.set(x++, y, ch, false, attr & 15, attr >> 4)
        if (x === columns) {
          x = 0
          ++y
        }
      }
    } else {
      imageData.set(x++, y, c & 255, false, (c >> 8) & 15, c >> 12)
      if (x === columns) {
        x = 0
        ++y
      }
    }
  }

  imageData.font = FontModule.font8x16x256(file, options)
  imageData.palette = PaletteModule.triplets16(file)

  return {
    imageData,
    sauce: file.sauce,
  }
}

// PCB parser
function pcb(bytes: Uint8Array, options: RenderOptions): ParsedData {
  const file = new File(bytes)
  const imageData = new ScreenData(80)
  imageData.font = FontModule.preset(options.font || '80x25', options)
  imageData.palette = PaletteModule.BIN

  let bg = 0
  let fg = 7
  let x = 0
  let y = 0

  const icecolors = file.sauce
    ? file.sauce.flags & 1 || options.icecolors || 0
    : options.icecolors || 0

  function printChar(charCode: number): void {
    imageData.set(x, y, charCode, false, fg, bg)
    if (++x === 80) {
      y++
      x = 0
    }
  }

  let loop = 0
  while (loop < file.size) {
    const charCode = bytes[loop]

    if (charCode === 26) {
      break
    }

    switch (charCode) {
      case 13:
        break
      case 10:
        y++
        x = 0
        break
      case 9:
        x += 8
        break
      case 64:
        if (bytes[loop + 1] === 88) {
          bg = bytes[loop + 2] - (bytes[loop + 2] >= 65 ? 55 : 48)
          if (!icecolors && bg > 7) {
            bg -= 8
          }
          fg = bytes[loop + 3] - (bytes[loop + 3] >= 65 ? 55 : 48)
          loop += 3
        } else if (
          bytes[loop + 1] === 67 &&
          bytes[loop + 2] === 76 &&
          bytes[loop + 3] === 83
        ) {
          x = y = 0
          imageData.reset()
          loop += 4
        } else if (
          bytes[loop + 1] === 80 &&
          bytes[loop + 2] === 79 &&
          bytes[loop + 3] === 83 &&
          bytes[loop + 4] === 58
        ) {
          if (bytes[loop + 6] === 64) {
            x = bytes[loop + 5] - 48 - 1
            loop += 5
          } else {
            x = 10 * (bytes[loop + 5] - 48) + bytes[loop + 6] - 48 - 1
            loop += 6
          }
        } else {
          printChar(charCode)
        }
        break
      default:
        printChar(charCode)
    }
    loop++
  }

  return {
    imageData,
    sauce: file.sauce,
  }
}

// TND parser
function tnd(bytes: Uint8Array, options: RenderOptions): ParsedData {
  const file = new File(bytes)

  function get32(file: FileObj): number {
    let value = file.get() << 24
    value += file.get() << 16
    value += file.get() << 8
    return value + file.get()
  }

  if (file.get() !== 24) {
    throw new Error('File ID does not match.')
  }
  if (file.getS(8) !== 'TUNDRA24') {
    throw new Error('File ID does not match.')
  }

  const fg = new Uint8Array(3)
  const bg = new Uint8Array(3)
  let x = 0
  let y = 0

  const imageData = new ScreenData(80)
  imageData.font = FontModule.preset(options.font || '80x25', options)
  imageData.palette = PaletteModule.ANSI

  while (!file.eof()) {
    if (x === 80) {
      x = 0
      ++y
    }
    let charCode = file.get()

    if (charCode === 1) {
      y = get32(file)
      x = get32(file)
    }
    if (charCode === 2) {
      charCode = file.get()
      file.get()
      fg.set(file.read(3), 0)
    }
    if (charCode === 4) {
      charCode = file.get()
      file.get()
      bg.set(file.read(3), 0)
    }
    if (charCode === 6) {
      charCode = file.get()
      file.get()
      fg.set(file.read(3), 0)
      file.get()
      bg.set(file.read(3), 0)
    }

    if (charCode !== 1 && charCode !== 2 && charCode !== 4 && charCode !== 6) {
      imageData.set(x, y, charCode, true, fg, bg)
      ++x
    }
  }

  return {
    imageData,
    sauce: file.sauce,
  }
}

// XB parser
function xb(bytes: Uint8Array, options: RenderOptions): ParsedData {
  const file = new File(bytes)

  type XBinHeader = {
    width: number
    height: number
    fontHeight: number
    palette: boolean
    font: boolean
    compressed: boolean
    nonBlink: boolean
    char512: boolean
  }

  function xBinHeader(file: FileObj): XBinHeader {
    if (file.getS(4) !== 'XBIN') {
      throw new Error('File ID does not match.')
    }
    if (file.get() !== 26) {
      throw new Error('File ID does not match.')
    }

    const header: XBinHeader = {} as XBinHeader
    header.width = file.get16()
    header.height = file.get16()
    header.fontHeight = file.get()

    if (header.fontHeight === 0 || header.fontHeight > 32) {
      throw new Error(
        `Illegal value for the font height (${header.fontHeight}).`,
      )
    }

    const flags = file.get()
    header.palette = (flags & 1) === 1
    header.font = (flags & 2) === 2

    if (header.fontHeight !== 16 && !header.font) {
      throw new Error(
        'A non-standard font size was defined, but no font information was included with the file.',
      )
    }

    header.compressed = (flags & 4) === 4
    header.nonBlink = (flags & 8) === 8
    header.char512 = (flags & 16) === 16

    return header
  }

  function uncompress(
    file: FileObj,
    width: number,
    height: number,
  ): Uint8Array {
    const uncompressed = new Uint8Array(width * height * 2)
    let i = 0

    while (i < uncompressed.length) {
      const p = file.get()
      const count = p & 63

      switch (p >> 6) {
        case 1: {
          const repeatChar = file.get()
          for (let j = 0; j <= count; ++j) {
            uncompressed[i++] = repeatChar
            uncompressed[i++] = file.get()
          }
          break
        }
        case 2: {
          const repeatAttr = file.get()
          for (let j = 0; j <= count; ++j) {
            uncompressed[i++] = file.get()
            uncompressed[i++] = repeatAttr
          }
          break
        }
        case 3: {
          const repChar = file.get()
          const repAttr = file.get()
          for (let j = 0; j <= count; ++j) {
            uncompressed[i++] = repChar
            uncompressed[i++] = repAttr
          }
          break
        }
        default:
          for (let j = 0; j <= count; ++j) {
            uncompressed[i++] = file.get()
            uncompressed[i++] = file.get()
          }
      }
    }
    return uncompressed
  }

  const header = xBinHeader(file)
  const imageData = new ScreenData(header.width)

  imageData.palette = header.palette
    ? PaletteModule.triplets16(file)
    : PaletteModule.BIN
  imageData.font = header.font
    ? FontModule.xbin(file, header.fontHeight, options)
    : FontModule.preset('80x25', options)

  if (header.compressed) {
    imageData.raw(uncompress(file, header.width, header.height))
  } else {
    imageData.raw(file.read(header.width * header.height * 2))
  }

  return {
    imageData,
    sauce: file.sauce,
  }
}

export function readBytes(
  bytes: Uint8Array,
  callback: (data: DisplayData | DisplayData[], sauce?: Sauce) => void,
  splitRows: number,
  options?: RenderOptions,
): void {
  options = validateOptions(options)

  let data: ParsedData
  switch (options.filetype) {
    case 'txt':
      data = asc(bytes, options)
      break
    case 'ion':
      data = asc(bytes, options)
      data.imageData.trimColumns()
      break
    case 'adf':
      data = adf(bytes, options)
      break
    case 'bin':
      data = bin(bytes, options)
      break
    case 'idf':
      data = idf(bytes, options)
      break
    case 'pcb':
      data = pcb(bytes, options)
      break
    case 'tnd':
      data = tnd(bytes, options)
      break
    case 'xb':
      data = xb(bytes, options)
      break
    case 'diz':
      data = ans(bytes, options)
      data.imageData.trimColumns()
      break
    default:
      data = ans(bytes, options)
  }

  if (splitRows > 0) {
    const returnArray: DisplayData[] = []
    for (let start = 0; start < data.imageData.rows; start += splitRows) {
      const displayData = display(data.imageData, start, splitRows)
      returnArray.push(displayData)
    }
    callback(returnArray, data.sauce)
  } else {
    const displayData = display(data.imageData, 0, data.imageData.rows)
    callback(displayData, data.sauce)
  }
}

export const ParserModule = {
  readBytes,
}
