import {
  indextopt,
  indextox,
  indextoy,
  linepoints,
  ptdist,
  ptstoarea,
  pttoindex,
  ptwithin,
  rectpoints,
} from 'zss/mapping/2d'

describe('2d', () => {
  describe('indextox', () => {
    it('should calculate x from index and width', () => {
      expect(indextox(0, 10)).toBe(0)
      expect(indextox(5, 10)).toBe(5)
      expect(indextox(9, 10)).toBe(9)
      expect(indextox(10, 10)).toBe(0)
      expect(indextox(15, 10)).toBe(5)
    })

    it('should handle different widths', () => {
      expect(indextox(0, 5)).toBe(0)
      expect(indextox(3, 5)).toBe(3)
      expect(indextox(5, 5)).toBe(0)
      expect(indextox(7, 5)).toBe(2)
    })
  })

  describe('indextoy', () => {
    it('should calculate y from index and width', () => {
      expect(indextoy(0, 10)).toBe(0)
      expect(indextoy(5, 10)).toBe(0)
      expect(indextoy(9, 10)).toBe(0)
      expect(indextoy(10, 10)).toBe(1)
      expect(indextoy(15, 10)).toBe(1)
      expect(indextoy(20, 10)).toBe(2)
    })

    it('should handle different widths', () => {
      expect(indextoy(0, 5)).toBe(0)
      expect(indextoy(4, 5)).toBe(0)
      expect(indextoy(5, 5)).toBe(1)
      expect(indextoy(7, 5)).toBe(1)
      expect(indextoy(10, 5)).toBe(2)
    })
  })

  describe('indextopt', () => {
    it('should convert index to point', () => {
      const pt = indextopt(0, 10)
      expect(pt).toEqual({ x: 0, y: 0 })

      const pt2 = indextopt(15, 10)
      expect(pt2).toEqual({ x: 5, y: 1 })

      const pt3 = indextopt(23, 10)
      expect(pt3).toEqual({ x: 3, y: 2 })
    })
  })

  describe('ptdist', () => {
    it('should calculate distance between points', () => {
      expect(ptdist({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0)
      expect(ptdist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
      expect(ptdist({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(Math.sqrt(2))
    })

    it('should handle negative coordinates', () => {
      expect(ptdist({ x: -1, y: -1 }, { x: 1, y: 1 })).toBeCloseTo(Math.sqrt(8))
    })

    it('should be symmetric', () => {
      const pt1 = { x: 1, y: 2 }
      const pt2 = { x: 4, y: 6 }
      expect(ptdist(pt1, pt2)).toBe(ptdist(pt2, pt1))
    })
  })

  describe('pttoindex', () => {
    it('should convert point to index', () => {
      expect(pttoindex({ x: 0, y: 0 }, 10)).toBe(0)
      expect(pttoindex({ x: 5, y: 0 }, 10)).toBe(5)
      expect(pttoindex({ x: 0, y: 1 }, 10)).toBe(10)
      expect(pttoindex({ x: 5, y: 1 }, 10)).toBe(15)
      expect(pttoindex({ x: 3, y: 2 }, 10)).toBe(23)
    })

    it('should be inverse of indextopt', () => {
      const width = 10
      for (let i = 0; i < 100; i++) {
        const pt = indextopt(i, width)
        const index = pttoindex(pt, width)
        expect(index).toBe(i)
      }
    })
  })

  describe('ptstoarea', () => {
    it('should format points as area string', () => {
      expect(ptstoarea({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe('0,0,5,5')
      expect(ptstoarea({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe('1,2,3,4')
    })

    it('should handle negative coordinates', () => {
      expect(ptstoarea({ x: -1, y: -2 }, { x: 3, y: 4 })).toBe('-1,-2,3,4')
    })
  })

  describe('ptwithin', () => {
    it('should check if point is within bounds', () => {
      expect(ptwithin(5, 5, 0, 10, 10, 0)).toBe(true)
      expect(ptwithin(0, 0, 0, 10, 10, 0)).toBe(true)
      expect(ptwithin(10, 10, 0, 10, 10, 0)).toBe(true)
    })

    it('should return false for points outside bounds', () => {
      expect(ptwithin(11, 5, 0, 10, 10, 0)).toBe(false)
      expect(ptwithin(5, 11, 0, 10, 10, 0)).toBe(false)
      expect(ptwithin(-1, 5, 0, 10, 10, 0)).toBe(false)
      expect(ptwithin(5, -1, 0, 10, 10, 0)).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(ptwithin(0, 0, 0, 0, 0, 0)).toBe(true)
      expect(ptwithin(1, 1, 0, 0, 0, 0)).toBe(false)
    })
  })

  describe('rectpoints', () => {
    it('should generate all points in rectangle', () => {
      const points = rectpoints(0, 0, 2, 2)
      expect(points).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ])
    })

    it('should handle reversed coordinates', () => {
      const points = rectpoints(2, 2, 0, 0)
      expect(points).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ])
    })

    it('should handle single point', () => {
      const points = rectpoints(5, 5, 5, 5)
      expect(points).toEqual([{ x: 5, y: 5 }])
    })

    it('should handle line rectangles', () => {
      const points = rectpoints(0, 0, 3, 0)
      expect(points).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ])
    })
  })

  describe('linepoints', () => {
    it('should generate points for horizontal line', () => {
      const points = linepoints(0, 0, 3, 0)
      expect(points.length).toBe(4)
      expect(points[0]).toEqual({ x: 0, y: 0 })
      expect(points[3]).toEqual({ x: 3, y: 0 })
    })

    it('should generate points for vertical line', () => {
      const points = linepoints(0, 0, 0, 3)
      expect(points.length).toBe(4)
      expect(points[0]).toEqual({ x: 0, y: 0 })
      expect(points[3]).toEqual({ x: 0, y: 3 })
    })

    it('should generate points for diagonal line', () => {
      const points = linepoints(0, 0, 2, 2)
      expect(points.length).toBeGreaterThan(2)
      expect(points[0]).toEqual({ x: 0, y: 0 })
      expect(points[points.length - 1]).toEqual({ x: 2, y: 2 })
    })

    it('should handle single point', () => {
      const points = linepoints(5, 5, 5, 5)
      expect(points).toEqual([{ x: 5, y: 5 }])
    })

    it('should handle reversed coordinates', () => {
      const points1 = linepoints(0, 0, 3, 3)
      const points2 = linepoints(3, 3, 0, 0)
      expect(points1.length).toBe(points2.length)
      expect(points1[0]).toEqual(points2[points2.length - 1])
      expect(points1[points1.length - 1]).toEqual(points2[0])
    })
  })
})
