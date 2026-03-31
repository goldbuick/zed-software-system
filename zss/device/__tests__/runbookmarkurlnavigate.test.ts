import * as apimod from 'zss/device/api'
import { runbookmarkurlnavigate } from 'zss/device/runbookmark'

describe('runbookmarkurlnavigate', () => {
  const device = {} as apimod.DEVICELIKE
  const player = 'p1'
  let apitoastspy: jest.SpiedFunction<typeof apimod.apitoast>

  beforeEach(() => {
    jest.useFakeTimers()
    apitoastspy = jest.spyOn(apimod, 'apitoast').mockImplementation(() => {})
    globalThis.window = {
      location: { href: '' },
    } as unknown as Window & typeof globalThis
  })

  afterEach(() => {
    jest.useRealTimers()
    apitoastspy.mockRestore()
  })

  it('apitoast, waitfor(2000), then sets window.location.href to trimmed href', async () => {
    const href = ' https://example.com/path '
    const done = runbookmarkurlnavigate(device, player, href)

    expect(apitoastspy).toHaveBeenCalledWith(
      device,
      player,
      expect.stringMatching(/example\.com\/path/),
    )
    expect(window.location.href).toBe('')

    await jest.advanceTimersByTimeAsync(2000)
    await done

    expect(window.location.href).toBe(href.trim())
  })
})
