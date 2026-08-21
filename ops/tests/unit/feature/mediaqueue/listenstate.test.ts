import {
  mediaqueueclearboardhelper,
  mediaqueueclearlistenstate,
  mediaqueuehasanybind,
  mediaqueuehelperconnected,
  mediaqueueisboundboard,
  mediaqueueislistening,
  mediaqueuereadboardsforhelper,
  mediaqueuereadboundboardids,
  mediaqueuereadhelperforboard,
  mediaqueuesetboardhelper,
  mediaqueuesethelperconnected,
} from 'zss/feature/mediaqueue/listenstate'

describe('mediaqueue listenstate board map', () => {
  afterEach(() => {
    mediaqueueclearlistenstate()
  })

  it('binds the same helper to multiple boards', () => {
    mediaqueuesetboardhelper('board-a', 'helper-1')
    mediaqueuesetboardhelper('board-b', 'helper-1')
    expect(mediaqueueislistening()).toBe(true)
    expect(mediaqueuehasanybind()).toBe(true)
    expect(mediaqueueisboundboard('board-a')).toBe(true)
    expect(mediaqueueisboundboard('board-b')).toBe(true)
    expect(mediaqueuereadhelperforboard('board-a')).toBe('helper-1')
    expect(mediaqueuereadboardsforhelper('helper-1').sort()).toEqual([
      'board-a',
      'board-b',
    ])
  })

  it('tracks different helpers per board', () => {
    mediaqueuesetboardhelper('board-a', 'helper-1')
    mediaqueuesetboardhelper('board-b', 'helper-2')
    expect(mediaqueuereadhelperforboard('board-a')).toBe('helper-1')
    expect(mediaqueuereadhelperforboard('board-b')).toBe('helper-2')
    expect(mediaqueuereadboardsforhelper('helper-1')).toEqual(['board-a'])
    expect(mediaqueuereadboardsforhelper('helper-2')).toEqual(['board-b'])
  })

  it('replaces a board helper without clearing other boards', () => {
    mediaqueuesetboardhelper('board-a', 'helper-1')
    mediaqueuesetboardhelper('board-b', 'helper-2')
    mediaqueuesetboardhelper('board-a', 'helper-3')
    expect(mediaqueuereadhelperforboard('board-a')).toBe('helper-3')
    expect(mediaqueuereadhelperforboard('board-b')).toBe('helper-2')
    expect(mediaqueuereadboardsforhelper('helper-1')).toEqual([])
  })

  it('clearing one board leaves other binds', () => {
    mediaqueuesetboardhelper('board-a', 'helper-1')
    mediaqueuesetboardhelper('board-b', 'helper-1')
    expect(mediaqueueclearboardhelper('board-a')).toBe('helper-1')
    expect(mediaqueueisboundboard('board-a')).toBe(false)
    expect(mediaqueueisboundboard('board-b')).toBe(true)
    expect(mediaqueueislistening()).toBe(true)
    expect(mediaqueuereadboundboardids()).toEqual(['board-b'])
  })

  it('tracks helper connection per peer', () => {
    mediaqueuesethelperconnected('helper-1', true)
    mediaqueuesethelperconnected('helper-2', false)
    expect(mediaqueuehelperconnected('helper-1')).toBe(true)
    expect(mediaqueuehelperconnected('helper-2')).toBe(false)
    expect(mediaqueuehelperconnected()).toBe(true)
    mediaqueuesethelperconnected('helper-1', false)
    expect(mediaqueuehelperconnected()).toBe(false)
  })
})
