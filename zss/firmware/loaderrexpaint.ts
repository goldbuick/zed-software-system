import {
  REXPAINT_READER,
  REXPAINT_READER_COLOR,
  REXPAINT_READER_LAYER,
} from 'zss/device/api'
import { loadpalettefrombytes } from 'zss/feature/bytes'
import { PALETTE } from 'zss/feature/palette'
import { FIRMWARE_COMMAND } from 'zss/firmware'
import { FILE_BYTES_PER_COLOR } from 'zss/gadget/data/types'
import { ptwithin } from 'zss/mapping/2d'
import { clamp } from 'zss/mapping/number'
import { ispresent, MAYBE } from 'zss/mapping/types'
import { memoryloadercontent } from 'zss/memory/loader'
import { ARG_TYPE, readargs } from 'zss/words/reader'
import { COLOR, NAME } from 'zss/words/types'

function distance(a: REXPAINT_READER_COLOR, b: REXPAINT_READER_COLOR) {
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2),
  )
}

const palette = loadpalettefrombytes(PALETTE)
function closestcolor(rexcolor: REXPAINT_READER_COLOR) {
  let color: MAYBE<COLOR>
  if (!ispresent(palette)) {
    return color
  }
  let colordist = 1000000000
  for (let i = 0; i <= (COLOR.BLACK as number); ++i) {
    const idx = i * FILE_BYTES_PER_COLOR
    const r = palette.bits[idx]
    const g = palette.bits[idx + 1]
    const b = palette.bits[idx + 2]
    const dist = distance(rexcolor, {
      r,
      g,
      b,
      hex: '',
    })
    if (dist < colordist) {
      color = i as COLOR
      colordist = dist
    }
  }
  return color
}

export const loaderrexpaint: FIRMWARE_COMMAND = (chip, words) => {
  const rexpaintreader: REXPAINT_READER = memoryloadercontent(chip.id())
  if (!ispresent(rexpaintreader)) {
    return 0
  }

  const [kind, ii] = readargs(words, 0, [ARG_TYPE.NAME])
  const lkind = NAME(kind)

  const layers = rexpaintreader.content?.layers ?? []
  switch (lkind) {
    case 'seek': {
      const [cursor] = readargs(words, ii, [ARG_TYPE.NUMBER])
      rexpaintreader.cursor = clamp(cursor, 0, layers.length - 1)
      break
    }
    case 'layer': {
      const cursor = rexpaintreader.cursor + 1
      rexpaintreader.cursor = clamp(cursor, 0, layers.length - 1)
      break
    }
    case 'char': {
      const [x, y, name] = readargs(words, ii, [
        ARG_TYPE.NUMBER,
        ARG_TYPE.NUMBER,
        ARG_TYPE.NAME,
      ])
      const layer: MAYBE<REXPAINT_READER_LAYER> =
        rexpaintreader.content?.layers[rexpaintreader.cursor]
      if (
        ispresent(layer) &&
        ptwithin(x, y, 0, layer.width - 1, layer.height - 1, 0)
      ) {
        chip.set(name, layer.raster[x + y * layer.width].asciiCode)
      }
      break
    }
    case 'color': {
      const [x, y, name] = readargs(words, ii, [
        ARG_TYPE.NUMBER,
        ARG_TYPE.NUMBER,
        ARG_TYPE.NAME,
      ])
      const layer: MAYBE<REXPAINT_READER_LAYER> =
        rexpaintreader.content?.layers[rexpaintreader.cursor]
      if (
        ispresent(layer) &&
        ptwithin(x, y, 0, layer.width - 1, layer.height - 1, 0)
      ) {
        // find closest match
        chip.set(name, closestcolor(layer.raster[x + y * layer.width].color))
      }
      break
    }
    case 'bg': {
      const [x, y, name] = readargs(words, ii, [
        ARG_TYPE.NUMBER,
        ARG_TYPE.NUMBER,
        ARG_TYPE.NAME,
      ])
      const layer: MAYBE<REXPAINT_READER_LAYER> =
        rexpaintreader.content?.layers[rexpaintreader.cursor]
      if (
        ispresent(layer) &&
        ptwithin(x, y, 0, layer.width - 1, layer.height - 1, 0)
      ) {
        // find closest match
        chip.set(name, closestcolor(layer.raster[x + y * layer.width].bg))
      }
      break
    }
  }

  return 0
}
