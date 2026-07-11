import {
  handlewanixexportmessage,
  notifywanixexportready,
  resetwanixexportwaitfortest,
  waitwanixexportcontentready,
} from 'zss/device/wanixclient/wanixexportwait'
import { WANIX_MSG_EXPORT } from 'zss/feature/wanix/wanixrpcmessages'

describe('wanixexportwait', () => {
  afterEach(() => {
    resetwanixexportwaitfortest()
  })

  it('resolves waitwanixexportcontentready on content-ready message', async () => {
    const taskrid = '42'
    const ready = waitwanixexportcontentready(taskrid, 5_000)
    handlewanixexportmessage({
      type: WANIX_MSG_EXPORT,
      taskrid,
      event: 'content-ready',
    })
    await expect(ready).resolves.toBeUndefined()
  })

  it('ignores mount-ready events', async () => {
    const taskrid = '42'
    const ready = waitwanixexportcontentready(taskrid, 50)
    notifywanixexportready(taskrid, 'mount-ready')
    await expect(ready).rejects.toThrow(/content-ready timeout/)
  })

  it('times out when no message arrives', async () => {
    await expect(waitwanixexportcontentready('99', 20)).rejects.toThrow(
      /content-ready timeout taskrid=99/,
    )
  })

  it('handlewanixexportmessage returns false for unrelated types', () => {
    expect(handlewanixexportmessage({ type: 'other' })).toBe(false)
  })
})
