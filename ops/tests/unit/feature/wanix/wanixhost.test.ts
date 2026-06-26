/**
 * @jest-environment jsdom
 */
import {
  iswanixspaceactive,
  readwanixhoststate,
} from 'zss/feature/wanix/wanixhost'

describe('wanixhost', () => {
  it('reports idle before spawn', () => {
    expect(readwanixhoststate()).toBe('idle')
    expect(iswanixspaceactive()).toBe(false)
  })
})
