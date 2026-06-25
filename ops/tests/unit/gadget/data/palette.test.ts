import { createbitmapfromarray } from 'zss/gadget/data/bitmap'
import { convertpalettetocolors } from 'zss/gadget/data/palette'
import { FILE_BYTES_PER_COLOR } from 'zss/gadget/data/types'

describe('palette', () => {
  describe('convertpalettetocolors', () => {
    it('should return empty array when palette is undefined', () => {
      const result = convertpalettetocolors(undefined)
      expect(result).toEqual([])
    })

    it('should convert palette bitmap to color array', () => {
      const bits = new Array(FILE_BYTES_PER_COLOR * 2).fill(0)
      bits[0] = 63
      bits[1] = 0
      bits[2] = 0
      bits[3] = 0
      bits[4] = 63
      bits[5] = 0

      const palette = createbitmapfromarray(FILE_BYTES_PER_COLOR * 2, 1, bits)
      const colors = convertpalettetocolors(palette, 2)

      expect(colors).toHaveLength(2)
      expect(colors[0].r).toBeCloseTo(1.0, 5)
      expect(colors[0].g).toBeCloseTo(0.0, 5)
      expect(colors[0].b).toBeCloseTo(0.0, 5)

      expect(colors[1].r).toBeCloseTo(0.0, 5)
      expect(colors[1].g).toBeCloseTo(1.0, 5)
      expect(colors[1].b).toBeCloseTo(0.0, 5)
    })

    it('should normalize color values from 0-63 to 0-1 range', () => {
      const bits = new Array(FILE_BYTES_PER_COLOR).fill(0)
      bits[0] = 31
      bits[1] = 47
      bits[2] = 15

      const palette = createbitmapfromarray(FILE_BYTES_PER_COLOR, 1, bits)
      const colors = convertpalettetocolors(palette, 1)

      expect(colors).toHaveLength(1)
      expect(colors[0].r).toBeCloseTo(31 / 63, 5)
      expect(colors[0].g).toBeCloseTo(47 / 63, 5)
      expect(colors[0].b).toBeCloseTo(15 / 63, 5)
    })

    it('should convert specified number of colors', () => {
      const bits = new Array(FILE_BYTES_PER_COLOR * 4).fill(0)
      const palette = createbitmapfromarray(FILE_BYTES_PER_COLOR * 4, 1, bits)
      const colors = convertpalettetocolors(palette, 2)

      expect(colors).toHaveLength(2)
    })

    it('should use default count of 16', () => {
      const bits = new Array(FILE_BYTES_PER_COLOR * 16).fill(0)
      const palette = createbitmapfromarray(FILE_BYTES_PER_COLOR * 16, 1, bits)
      const colors = convertpalettetocolors(palette)

      expect(colors).toHaveLength(16)
    })

    it('should handle partial color data correctly', () => {
      const bits = new Array(FILE_BYTES_PER_COLOR).fill(0)
      bits[0] = 63
      bits[1] = 63
      bits[2] = 63

      const palette = createbitmapfromarray(FILE_BYTES_PER_COLOR, 1, bits)
      const colors = convertpalettetocolors(palette, 2)

      expect(colors.length).toBeGreaterThanOrEqual(1)
    })
  })
})
