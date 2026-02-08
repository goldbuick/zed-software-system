import { stringsplice, totarget } from 'zss/mapping/string'

describe('string', () => {
  describe('stringsplice', () => {
    it('should remove characters at index', () => {
      expect(stringsplice('hello', 1, 2)).toBe('hlo')
      expect(stringsplice('hello', 0, 1)).toBe('ello')
      expect(stringsplice('hello', 4, 1)).toBe('hell')
    })

    it('should insert characters at index', () => {
      expect(stringsplice('hello', 1, 0, 'X')).toBe('hXello')
      expect(stringsplice('hello', 0, 0, 'X')).toBe('Xhello')
      expect(stringsplice('hello', 5, 0, 'X')).toBe('helloX')
    })

    it('should replace characters at index', () => {
      expect(stringsplice('hello', 1, 2, 'XX')).toBe('hXXlo')
      expect(stringsplice('hello', 0, 1, 'H')).toBe('Hello')
    })

    it('should handle empty string', () => {
      expect(stringsplice('', 0, 0, 'test')).toBe('test')
      expect(stringsplice('', 0, 0)).toBe('')
    })

    it('should handle index out of bounds', () => {
      expect(stringsplice('hello', 10, 1)).toBe('hello')
      expect(stringsplice('hello', 10, 1, 'X')).toBe('helloX')
    })

    it('should handle count exceeding string length', () => {
      expect(stringsplice('hello', 2, 100)).toBe('he')
      expect(stringsplice('hello', 2, 100, 'X')).toBe('heX')
    })

    it('should work without insert parameter', () => {
      expect(stringsplice('hello', 1, 2)).toBe('hlo')
      expect(stringsplice('hello', 0, 5)).toBe('')
    })
  })

  describe('totarget', () => {
    it('should parse scope with label', () => {
      const [target, label] = totarget('target:label')
      expect(target).toBe('target')
      expect(label).toBe('label')
    })

    it('should use self as target when no label', () => {
      const [target, label] = totarget('justlabel')
      expect(target).toBe('self')
      expect(label).toBe('justlabel')
    })

    it('should handle empty string', () => {
      const [target, label] = totarget('')
      expect(target).toBe('self')
      expect(label).toBe('')
    })

    it('should handle multiple colons', () => {
      // split(':') splits on all colons, so only first part is target
      const [target, label] = totarget('target:label:extra')
      expect(target).toBe('target')
      expect(label).toBe('label') // Only first part after colon
    })

    it('should handle scope starting with colon', () => {
      const [target, label] = totarget(':label')
      expect(target).toBe('')
      expect(label).toBe('label')
    })

    it('should handle scope ending with colon', () => {
      const [target, label] = totarget('target:')
      expect(target).toBe('target')
      expect(label).toBe('')
    })

    it('should handle just colon', () => {
      const [target, label] = totarget(':')
      expect(target).toBe('')
      expect(label).toBe('')
    })
  })
})
