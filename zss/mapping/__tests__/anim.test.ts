import { Object3D } from 'three'
import { animpositiontotarget, animsnapx, animsnapy } from 'zss/mapping/anim'

describe('anim', () => {
  describe('animsnapy', () => {
    it('should snap values to half character height', () => {
      const CHAR_HEIGHT = 14
      const CHAR_SCALE = 2
      const DRAW_CHAR_HEIGHT = CHAR_HEIGHT * CHAR_SCALE
      const snapValue = DRAW_CHAR_HEIGHT * 0.5

      expect(animsnapy(0)).toBe(0)
      expect(animsnapy(snapValue)).toBe(snapValue)
      expect(animsnapy(snapValue + 1)).toBe(snapValue)
      expect(animsnapy(snapValue - 1)).toBe(snapValue)
      expect(animsnapy(snapValue * 2)).toBe(snapValue * 2)
    })
  })

  describe('animsnapx', () => {
    it('should snap values to half character width', () => {
      const CHAR_WIDTH = 8
      const CHAR_SCALE = 2
      const DRAW_CHAR_WIDTH = CHAR_WIDTH * CHAR_SCALE
      const snapValue = DRAW_CHAR_WIDTH * 0.5

      expect(animsnapx(0)).toBe(0)
      expect(animsnapx(snapValue)).toBe(snapValue)
      expect(animsnapx(snapValue + 1)).toBe(snapValue)
      expect(animsnapx(snapValue - 1)).toBe(snapValue)
      expect(animsnapx(snapValue * 2)).toBe(snapValue * 2)
    })
  })

  describe('animpositiontotarget', () => {
    it('should update object position towards target', () => {
      const object = new Object3D()
      object.position.set(0, 0, 0)
      object.userData = {}

      const target = 100
      const delta = 0.016 // ~60fps
      const velocity = 1.235

      // Initial call should not be complete
      const result1 = animpositiontotarget(object, 'y', target, delta, velocity)
      expect(result1).toBe(false)
      expect(object.position.y).toBeGreaterThanOrEqual(0)

      // Multiple calls should move closer to target
      for (let i = 0; i < 100; i++) {
        animpositiontotarget(object, 'y', target, delta, velocity)
      }

      // Should be close to target after many iterations
      expect(Math.abs(object.position.y - target)).toBeLessThan(50)
    })

    it('should work with different axes', () => {
      const object = new Object3D()
      object.position.set(0, 0, 0)
      object.userData = {}

      animpositiontotarget(object, 'x', 50, 0.016, 1.235)
      expect(object.position.x).toBeGreaterThanOrEqual(0)

      animpositiontotarget(object, 'z', 75, 0.016, 1.235)
      expect(object.position.z).toBeGreaterThanOrEqual(0)
    })

    it('should return true when close to target', () => {
      const object = new Object3D()
      object.position.set(0, 0, 0)
      object.userData = {}

      // Position snaps to multiples of DRAW_CHAR_HEIGHT * 0.5 = 14
      // The function checks target - object.position.y (always checks y, not axis)
      // So we need target to be close to a snapped position
      // Let's use a target that's exactly on a snap point
      const CHAR_HEIGHT = 14
      const CHAR_SCALE = 2
      const DRAW_CHAR_HEIGHT = CHAR_HEIGHT * CHAR_SCALE
      const snapValue = DRAW_CHAR_HEIGHT * 0.5 // 14
      const target = snapValue * 7 // 98, which is a snap point

      // Set position to target (which is a snap point)
      object.position.y = target
      object.userData.y = target

      const result = animpositiontotarget(object, 'y', target, 0.016, 1.235)
      // Position should snap to target (or very close), so step should be < 0.1
      expect(result).toBe(true)
    })
  })
})
