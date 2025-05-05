import pako from 'pako'
import {
  REXPAINT_READER_COLOR,
  REXPAINT_READER_LAYER,
  REXPAINT_READER_OBJECT,
  REXPAINT_READER_PIXEL,
} from 'zss/device/api'

function rgbobj2csshex(color: REXPAINT_READER_COLOR) {
  let r = color.r.toString(16)
  let g = color.g.toString(16)
  let b = color.b.toString(16)
  if (r.length < 2) {
    r = '0' + r
  }
  if (g.length < 2) {
    g = '0' + g
  }
  if (b.length < 2) {
    b = '0' + b
  }
  return r + g + b
}

export const fromBuffer = (
  compressed: Uint8Array,
): Promise<REXPAINT_READER_OBJECT> => {
  return new Promise((resolve, reject) => {
    try {
      const buffer = pako.inflate(compressed)
      const ob = loadinflatedbuffer(buffer)
      resolve(ob)
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      reject(err)
    }
  })
}

const loadinflatedbuffer = (buffer: Uint8Array): REXPAINT_READER_OBJECT => {
  const reader = new DataView(buffer.buffer)

  const ob: REXPAINT_READER_OBJECT = {
    version: reader.getUint32(0, true),
    layers: [],
  }
  const numLayers = reader.getUint32(4, true)

  let curOffset = 8
  for (let i = 0; i < numLayers; i++) {
    const layer: REXPAINT_READER_LAYER = {
      width: 0,
      height: 0,
      raster: [],
    }
    layer.width = reader.getUint32(curOffset, true)
    curOffset += 4
    layer.height = reader.getUint32(curOffset, true)
    curOffset += 4

    layer.raster = Array(layer.height * layer.width)
    for (let x = 0; x < layer.width; x++) {
      for (let y = 0; y < layer.height; y++) {
        const pix: REXPAINT_READER_PIXEL = {
          asciiCode: reader.getUint32(curOffset, true),
          transparent: false,
          color: { r: 0, g: 0, b: 0, hex: '' },
          bg: { r: 0, g: 0, b: 0, hex: '' },
        }
        curOffset += 4
        pix.color.r = reader.getUint8(curOffset++)
        pix.color.g = reader.getUint8(curOffset++)
        pix.color.b = reader.getUint8(curOffset++)
        pix.color.hex = rgbobj2csshex(pix.color)
        pix.bg.r = reader.getUint8(curOffset++)
        pix.bg.g = reader.getUint8(curOffset++)
        pix.bg.b = reader.getUint8(curOffset++)
        pix.bg.hex = rgbobj2csshex(pix.bg)
        pix.transparent = pix.bg.r === 255 && pix.bg.g === 0 && pix.bg.b === 255
        layer.raster[x + layer.width * y] = pix
      }
    }

    ob.layers.push(layer)
  }

  return ob
}
