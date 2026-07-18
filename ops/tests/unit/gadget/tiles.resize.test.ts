/**
 * useTiles resize policy: realloc when area OR aspect changes (new store).
 * Mirrors the guard in zss/gadget/tiles.ts (hook itself needs React).
 */
function shouldresizetiles(
  state: { char: unknown[]; width: number; height: number },
  width: number,
  height: number,
): boolean {
  const size = width * height
  return (
    state.char.length !== size ||
    state.width !== width ||
    state.height !== height
  )
}

describe('useTiles resize guard', () => {
  it('resizes when cell count changes', () => {
    const state = { char: new Array(100), width: 10, height: 10 }
    expect(shouldresizetiles(state, 20, 10)).toBe(true)
  })

  it('resizes when aspect changes but area is unchanged', () => {
    const state = { char: new Array(2000), width: 100, height: 20 }
    expect(shouldresizetiles(state, 80, 25)).toBe(true)
  })

  it('skips when width and height match', () => {
    const state = { char: new Array(2000), width: 80, height: 25 }
    expect(shouldresizetiles(state, 80, 25)).toBe(false)
  })
})
