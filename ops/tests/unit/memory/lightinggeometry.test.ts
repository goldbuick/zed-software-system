import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import {
  LIGHTING_RAY_TILE_YSCALE,
  lightingmixmaxrange,
  memorylightingaddrangetoblocked,
} from 'zss/memory/lightinggeometry'

describe('lightinggeometry', () => {
  describe('LIGHTING_RAY_TILE_YSCALE', () => {
    it('matches gadget char cell aspect CHAR_HEIGHT / CHAR_WIDTH', () => {
      expect(LIGHTING_RAY_TILE_YSCALE).toBe(CHAR_HEIGHT / CHAR_WIDTH)
    })
  })

  describe('lightingmixmaxrange', () => {
    it('returns a sector for a horizontal neighbor (east)', () => {
      expect(lightingmixmaxrange({ x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([
        -86, 86,
      ])
    })

    it('returns a sector for a vertical neighbor', () => {
      expect(lightingmixmaxrange({ x: 10, y: 10 }, { x: 10, y: 11 })).toEqual([
        28, 152,
      ])
    })

    it('uses a narrower sector for object occluders than full terrain tile', () => {
      const from = { x: 0, y: 0 }
      const dest = { x: 3, y: 0 }
      const terrain = lightingmixmaxrange(from, dest, 'terrain')
      const object = lightingmixmaxrange(from, dest, 'object')
      const terrainspan =
        terrain[0] <= terrain[1]
          ? terrain[1] - terrain[0]
          : 360 - terrain[0] + terrain[1]
      const objectspan =
        object[0] <= object[1]
          ? object[1] - object[0]
          : 360 - object[0] + object[1]
      expect(objectspan).toBeLessThan(terrainspan)
    })
  })

  describe('memorylightingaddrangetoblocked', () => {
    it('appends partial shadow ranges without merging into full blocks', () => {
      const blocked: [number, number, number][] = []
      memorylightingaddrangetoblocked(blocked, [10, 80, 0.4])
      expect(blocked).toEqual([[10, 80, 0.4]])
    })

    it('merges overlapping full sectors into one arc', () => {
      const blocked: [number, number, number][] = []
      memorylightingaddrangetoblocked(blocked, [0, 45, 1])
      expect(blocked).toEqual([[0, 45, 1]])
      memorylightingaddrangetoblocked(blocked, [30, 60, 1])
      expect(blocked).toEqual([[0, 60, 1]])
    })

    it('does not merge full shadow with partial entries', () => {
      const blocked: [number, number, number][] = []
      memorylightingaddrangetoblocked(blocked, [0, 30, 0.5])
      memorylightingaddrangetoblocked(blocked, [10, 50, 1])
      expect(blocked).toHaveLength(2)
      expect(blocked).toContainEqual([0, 30, 0.5])
      expect(blocked.some((e) => e[2] === 1)).toBe(true)
    })

    it('terminates for many random full-sector merges (regression: infinite loop)', () => {
      const t0 = performance.now()
      for (let trial = 0; trial < 4000; trial++) {
        const b: [number, number, number][] = []
        const n = 3 + Math.floor(Math.random() * 20)
        for (let i = 0; i < n; i++) {
          memorylightingaddrangetoblocked(b, [
            Math.floor(Math.random() * 360),
            Math.floor(Math.random() * 360),
            1,
          ])
        }
      }
      expect(performance.now() - t0).toBeLessThan(8000)
    })
  })
})
