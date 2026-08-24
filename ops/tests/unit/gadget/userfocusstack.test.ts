import mitt from 'mitt'
import {
  user,
  userfocuspop,
  userfocuspush,
  userfocusreset,
} from 'zss/gadget/userinputcontext'

describe('userfocus stack', () => {
  afterEach(() => {
    userfocusreset()
  })

  it('keeps editor focus when an earlier scroll layer unmounts', () => {
    const base = user.root
    const scroll = mitt()
    const editor = mitt()

    userfocuspush(scroll, false)
    expect(user.root).toBe(scroll)

    userfocuspush(editor, true)
    expect(user.root).toBe(editor)
    expect(user.ignorehotkeys).toBe(true)

    // Scroll exit finishes after editor opened -- must not restore board.
    userfocuspop(scroll)
    expect(user.root).toBe(editor)
    expect(user.ignorehotkeys).toBe(true)

    userfocuspop(editor)
    expect(user.root).toBe(base)
    expect(user.ignorehotkeys).toBe(false)
  })

  it('updates ignorehotkeys on an existing layer without reordering', () => {
    const lower = mitt()
    const upper = mitt()

    userfocuspush(lower, false)
    userfocuspush(upper, false)
    userfocuspush(lower, true)

    expect(user.root).toBe(upper)
    expect(user.ignorehotkeys).toBe(false)

    userfocuspop(upper)
    expect(user.root).toBe(lower)
    expect(user.ignorehotkeys).toBe(true)
  })
})
