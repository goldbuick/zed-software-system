import {
  FORMAT_SKIP,
  formatobject,
  packformat,
  unformatobject,
  unpackformat,
} from 'zss/feature/format'

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
}))

describe('format', () => {
  describe('FORMAT_SKIP', () => {
    it('returns null', () => {
      expect(FORMAT_SKIP()).toBeNull()
    })
  })

  describe('formatobject', () => {
    it('formats object with keymap', () => {
      const obj = { foo: 1, bar: 2 }
      const keymap = { foo: 'f', bar: 'b' }
      expect(formatobject(obj, keymap)).toEqual(['f', 1, 'b', 2])
    })

    it('applies formatter when provided', () => {
      const obj = { x: 42 }
      const formatmap = {
        x: (v: number) => v * 2,
      }
      expect(formatobject(obj, {}, formatmap)).toEqual(['x', 84])
    })

    it('skips keys where formatter returns null', () => {
      const obj = { a: 1, b: 2 }
      const formatmap = {
        b: () => null,
      }
      expect(formatobject(obj, {}, formatmap)).toEqual(['a', 1])
    })

    it('returns undefined for absent obj', () => {
      expect(formatobject(undefined, {})).toBeUndefined()
      expect(formatobject(null, {})).toBeUndefined()
    })
  })

  describe('unformatobject', () => {
    it('unformats array to object with keymap', () => {
      const formatted = ['f', 1, 'b', 2]
      const keymap = { f: 'foo', b: 'bar' }
      expect(unformatobject(formatted, keymap)).toEqual({ foo: 1, bar: 2 })
    })

    it('applies formatter when provided', () => {
      const formatted = ['x', 84]
      const formatmap = {
        x: (v: number) => v / 2,
      }
      expect(unformatobject(formatted, {}, formatmap)).toEqual({ x: 42 })
    })

    it('returns undefined for absent formatted', () => {
      expect(unformatobject(undefined, {})).toBeUndefined()
    })
  })

  describe('packformat', () => {
    it('packs FORMAT_OBJECT to Uint8Array', () => {
      const entry: [string?, any?, ...any[]] = ['key', 42]
      const result = packformat(entry)
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result!.length).toBeGreaterThan(0)
    })
  })

  describe('unpackformat', () => {
    it('unpacks Uint8Array to FORMAT_OBJECT', () => {
      const entry: [string?, any?, ...any[]] = ['key', 42]
      const packed = packformat(entry)!
      const unpacked = unpackformat(packed)
      expect(unpacked).toEqual(entry)
    })

    it('parses JSON string', () => {
      const json = JSON.stringify(['a', 1, 'b', 2])
      expect(unpackformat(json)).toEqual(['a', 1, 'b', 2])
    })

    it('returns undefined for invalid string', () => {
      expect(unpackformat('not json')).toBeUndefined()
    })
  })

  describe('formatobject <-> unformatobject round-trip', () => {
    it('round-trips with keymap', () => {
      const obj = { foo: 'a', bar: 123 }
      const formatKeymap = { foo: 'f', bar: 'b' }
      const unformatKeymap = { f: 'foo', b: 'bar' }
      const formatted = formatobject(obj, formatKeymap)!
      expect(unformatobject(formatted, unformatKeymap)).toEqual(obj)
    })

    it('round-trips with formatmap', () => {
      const obj = { n: 10 }
      const formatmap = {
        n: (v: number) => v.toString(),
      }
      const unformatmap = {
        n: (v: string) => parseInt(v, 10),
      }
      const formatted = formatobject(obj, {}, formatmap)!
      expect(unformatobject(formatted, {}, unformatmap)).toEqual(obj)
    })
  })
})
