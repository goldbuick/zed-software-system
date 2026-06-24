/**
 * @jest-environment jsdom
 */
import {
  iswanixspaceactive,
  readwanixhoststate,
  runwanixcommand,
} from 'zss/feature/wanix/wanixhost'

describe('wanixhost', () => {
  it('reports idle before spawn', () => {
    expect(readwanixhoststate()).toBe('idle')
    expect(iswanixspaceactive()).toBe(false)
  })

  it('rejects run when not ready', async () => {
    await expect(runwanixcommand('hello.wasm')).rejects.toThrow(
      'wanix not running — drop a .wasm to start',
    )
  })
})
