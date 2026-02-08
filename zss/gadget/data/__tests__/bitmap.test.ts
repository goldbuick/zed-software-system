import {
  bitmapToCanvas,
  createbitmap,
  createbitmapfromarray,
  createspritebitmapfrombitmap,
} from 'zss/gadget/data/bitmap'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'

// Mock document.createElement for Node.js environment
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(),
}

const mockContext = {
  getImageData: jest.fn(),
  putImageData: jest.fn(),
}

const mockImageData = {
  data: new Uint8ClampedArray(),
}

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks()

  // Setup default mock implementations
  mockContext.getImageData.mockReturnValue(mockImageData)
  mockCanvas.getContext.mockReturnValue(mockContext)
  mockImageData.data = new Uint8ClampedArray()

  // Mock document.createElement
  global.document = {
    createElement: jest.fn((tag: string) => {
      if (tag === 'canvas') {
        return mockCanvas as any
      }
      return {} as any
    }),
  } as any
})

describe('bitmap', () => {
  describe('createbitmap', () => {
    it('should create a bitmap with correct dimensions', () => {
      const bitmap = createbitmap(10, 20)
      expect(bitmap.width).toBe(10)
      expect(bitmap.height).toBe(20)
      expect(bitmap.size).toBe(200)
    })

    it('should initialize bits array with zeros', () => {
      const bitmap = createbitmap(5, 5)
      expect(bitmap.bits).toBeInstanceOf(Uint8Array)
      expect(bitmap.bits.length).toBe(25)
      expect(Array.from(bitmap.bits).every((v) => v === 0)).toBe(true)
    })
  })

  describe('createbitmapfromarray', () => {
    it('should create a bitmap from array of bits', () => {
      const bits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const bitmap = createbitmapfromarray(5, 2, bits)
      expect(bitmap.width).toBe(5)
      expect(bitmap.height).toBe(2)
      expect(bitmap.size).toBe(10)
      expect(Array.from(bitmap.bits)).toEqual(bits)
    })

    it('should handle empty array', () => {
      const bitmap = createbitmapfromarray(0, 0, [])
      expect(bitmap.width).toBe(0)
      expect(bitmap.height).toBe(0)
      expect(bitmap.size).toBe(0)
      expect(bitmap.bits.length).toBe(0)
    })
  })

  describe('bitmapToCanvas', () => {
    it('should create a canvas element', () => {
      const bitmap = createbitmap(10, 20)
      bitmapToCanvas(bitmap)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(global.document.createElement).toHaveBeenCalledWith('canvas')
    })

    it('should set canvas dimensions from bitmap', () => {
      const bitmap = createbitmap(10, 20)
      bitmapToCanvas(bitmap)
      expect(mockCanvas.width).toBe(10)
      expect(mockCanvas.height).toBe(20)
    })

    it('should handle undefined bitmap by creating 1x1 canvas', () => {
      bitmapToCanvas(undefined as any)
      expect(mockCanvas.width).toBe(1)
      expect(mockCanvas.height).toBe(1)
    })

    it('should convert bitmap bits to image data', () => {
      const bitmap = createbitmap(2, 2)
      bitmap.bits[0] = 100
      bitmap.bits[1] = 150
      bitmap.bits[2] = 200
      bitmap.bits[3] = 255

      // Setup imageData with correct size (width * height * 4 for RGBA)
      const imageDataSize = 2 * 2 * 4
      mockImageData.data = new Uint8ClampedArray(imageDataSize)

      bitmapToCanvas(bitmap)

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 2, 2)
      expect(mockContext.putImageData).toHaveBeenCalled()

      // Verify the image data was set correctly
      const callArgs = mockContext.putImageData.mock.calls[0]
      const imageData = callArgs[0]
      expect(imageData.data[0]).toBe(100) // R
      expect(imageData.data[1]).toBe(100) // G
      expect(imageData.data[2]).toBe(100) // B
      expect(imageData.data[3]).toBe(255) // A
      expect(imageData.data[4]).toBe(150) // R
      expect(imageData.data[5]).toBe(150) // G
      expect(imageData.data[6]).toBe(150) // B
      expect(imageData.data[7]).toBe(255) // A
    })

    it('should handle missing context gracefully', () => {
      mockCanvas.getContext.mockReturnValue(null)
      const bitmap = createbitmap(10, 20)
      const canvas = bitmapToCanvas(bitmap)
      expect(canvas).toBe(mockCanvas)
    })
  })

  describe('createspritebitmapfrombitmap', () => {
    it('should return undefined for undefined source', () => {
      const result = createspritebitmapfrombitmap(undefined, 8, 14)
      expect(result).toBeUndefined()
    })

    it('should create sprite bitmap with padding', () => {
      const source = createbitmap(CHAR_WIDTH * 2, CHAR_HEIGHT * 2)
      // Fill with some test data
      source.bits.fill(100)

      const result = createspritebitmapfrombitmap(
        source,
        CHAR_WIDTH,
        CHAR_HEIGHT,
      )

      expect(result).toBeDefined()
      if (result) {
        // Should have 2 cols and 2 rows
        // Each sprite is padded: charwidth + 2, charheight + 2
        const padWidth = CHAR_WIDTH + 2
        const padHeight = CHAR_HEIGHT + 2
        const expectedWidth = 2 * padWidth
        const expectedHeight = 2 * padHeight
        expect(result.width).toBe(expectedWidth)
        expect(result.height).toBe(expectedHeight)
      }
    })

    it('should copy source bits with correct padding', () => {
      const source = createbitmap(CHAR_WIDTH, CHAR_HEIGHT)
      // Set a pattern to verify copying
      source.bits[0] = 255
      source.bits[CHAR_WIDTH - 1] = 200
      source.bits[CHAR_WIDTH * (CHAR_HEIGHT - 1)] = 150

      const result = createspritebitmapfrombitmap(
        source,
        CHAR_WIDTH,
        CHAR_HEIGHT,
      )

      expect(result).toBeDefined()
      if (result) {
        const padWidth = CHAR_WIDTH + 2

        // First pixel (offset by 1,1 for padding)
        const firstIdx = 1 + 1 * padWidth
        expect(result.bits[firstIdx]).toBe(255)

        // Last pixel of first row (offset by 1,1 for padding)
        const lastRowIdx = CHAR_WIDTH - 1 + 1 + 1 * padWidth
        expect(result.bits[lastRowIdx]).toBe(200)

        // First pixel of last row
        const firstLastRowIdx = 1 + (CHAR_HEIGHT - 1 + 1) * padWidth
        expect(result.bits[firstLastRowIdx]).toBe(150)
      }
    })

    it('should apply horizontal edge padding', () => {
      const source = createbitmap(CHAR_WIDTH, CHAR_HEIGHT)
      source.bits[0] = 100 // Left edge
      source.bits[CHAR_WIDTH - 1] = 200 // Right edge

      const result = createspritebitmapfrombitmap(
        source,
        CHAR_WIDTH,
        CHAR_HEIGHT,
      )

      expect(result).toBeDefined()
      if (result) {
        const padWidth = CHAR_WIDTH + 2
        // Left edge padding (x = 0, y = 1)
        const leftPadIdx = 0 + 1 * padWidth
        expect(result.bits[leftPadIdx]).toBe(100)

        // Right edge padding (x = CHAR_WIDTH + 1, y = 1)
        const rightPadIdx = CHAR_WIDTH + 1 + 1 * padWidth
        expect(result.bits[rightPadIdx]).toBe(200)
      }
    })

    it('should apply vertical edge padding', () => {
      const source = createbitmap(CHAR_WIDTH, CHAR_HEIGHT)
      source.bits[0] = 100 // Top edge
      source.bits[CHAR_WIDTH * (CHAR_HEIGHT - 1)] = 200 // Bottom edge

      const result = createspritebitmapfrombitmap(
        source,
        CHAR_WIDTH,
        CHAR_HEIGHT,
      )

      expect(result).toBeDefined()
      if (result) {
        const padWidth = CHAR_WIDTH + 2
        // Top edge padding (x = 1, y = 0)
        const topPadIdx = 1 + 0 * padWidth
        expect(result.bits[topPadIdx]).toBe(100)

        // Bottom edge padding (x = 1, y = CHAR_HEIGHT + 1)
        const bottomPadIdx = 1 + (CHAR_HEIGHT + 1) * padWidth
        expect(result.bits[bottomPadIdx]).toBe(200)
      }
    })

    it('should handle non-integer divisions correctly', () => {
      // Source that doesn't divide evenly
      const source = createbitmap(CHAR_WIDTH * 2 + 3, CHAR_HEIGHT * 2 + 5)
      const result = createspritebitmapfrombitmap(
        source,
        CHAR_WIDTH,
        CHAR_HEIGHT,
      )

      expect(result).toBeDefined()
      if (result) {
        // Should round to nearest grid
        const cols = Math.round(source.width / CHAR_WIDTH)
        const rows = Math.round(source.height / CHAR_HEIGHT)
        const padWidth = CHAR_WIDTH + 2
        const padHeight = CHAR_HEIGHT + 2
        expect(result.width).toBe(cols * padWidth)
        expect(result.height).toBe(rows * padHeight)
      }
    })
  })
})
