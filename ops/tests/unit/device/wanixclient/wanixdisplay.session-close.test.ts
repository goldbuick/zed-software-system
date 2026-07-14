import {
  applywanixsessionmessage,
  registerwanixsessioncloseprune,
  resetwanixattachstatefortest,
  setattachedsession,
} from 'zss/device/wanixclient/wanixdisplay'
import { resetwanixtermbufferfortest } from 'zss/device/wanixclient/wanixtermbuffer'

describe('wanixdisplay session close prune', () => {
  afterEach(() => {
    resetwanixattachstatefortest()
    resetwanixtermbufferfortest()
  })

  it('runs prune when the attached session closes', () => {
    const pruned: string[] = []
    registerwanixsessioncloseprune((sessionkey) => {
      pruned.push(sessionkey)
    })
    setattachedsession('zedsync')
    applywanixsessionmessage({ event: 'close', sessionkey: 'zedsync' })
    expect(pruned).toEqual(['zedsync'])
  })

  it('runs prune when a non-attached session closes', () => {
    const pruned: string[] = []
    registerwanixsessioncloseprune((sessionkey) => {
      pruned.push(sessionkey)
    })
    setattachedsession('other')
    applywanixsessionmessage({ event: 'close', sessionkey: 'zedsync' })
    expect(pruned).toEqual(['zedsync'])
  })
})
