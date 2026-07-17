import {
  applywanixsessionmessage,
  detachwanixterm,
  readattachedsession,
  registerwanixsessioncloseprune,
  resetwanixattachstatefortest,
  setattachedsession,
} from 'zss/device/wanixclient/wanixdisplay'
import {
  readwanixroomconfig,
  setwanixroomconfig,
} from 'zss/device/wanixclient/state'
import { removewanixroomtask } from 'zss/device/wanixclient/wanixroom'
import {
  readwanixtermbufferkeys,
  registerwanixtermsessionopen,
  resetwanixtermbufferfortest,
} from 'zss/device/wanixclient/wanixtermbuffer'
import { iswanixdaemontaskid } from 'zss/device/wanixserver/taskidlepolicy'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'
import {
  WANIX_ZEDCAFE_TASK_ID,
  WANIX_ZEDSYNC_TASK_ID,
} from 'zss/feature/wanix/wanixzedcafeconstants'

/** Mirror production daemon-aware prune (wanixroom onwanixsessionclose). */
function registerdaemonawareprune() {
  registerwanixsessioncloseprune((sessionkey) => {
    if (iswanixdaemontaskid(sessionkey)) {
      return
    }
    removewanixroomtask(sessionkey)
  })
}

describe('wanixdisplay session close prune', () => {
  afterEach(() => {
    resetwanixattachstatefortest()
    resetwanixtermbufferfortest()
    setwanixroomconfig(createidleroomconfig())
  })

  it('runs prune when a one-shot attached session closes', () => {
    const pruned: string[] = []
    registerwanixsessioncloseprune((sessionkey) => {
      pruned.push(sessionkey)
    })
    setattachedsession('hello-wat')
    applywanixsessionmessage({ event: 'close', sessionkey: 'hello-wat' })
    expect(pruned).toEqual(['hello-wat'])
  })

  it('runs prune when a non-attached one-shot session closes', () => {
    const pruned: string[] = []
    registerwanixsessioncloseprune((sessionkey) => {
      pruned.push(sessionkey)
    })
    setattachedsession('other')
    applywanixsessionmessage({ event: 'close', sessionkey: 'hello-wat' })
    expect(pruned).toEqual(['hello-wat'])
  })

  it('keeps zedsync attachable after detach then close', () => {
    registerwanixtermsessionopen(WANIX_ZEDSYNC_TASK_ID)
    setattachedsession(WANIX_ZEDSYNC_TASK_ID)
    detachwanixterm()
    expect(readattachedsession()).toBeNull()

    applywanixsessionmessage({
      event: 'close',
      sessionkey: WANIX_ZEDSYNC_TASK_ID,
    })

    expect(readwanixtermbufferkeys()).toContain(WANIX_ZEDSYNC_TASK_ID)
    setattachedsession(WANIX_ZEDSYNC_TASK_ID)
    expect(readattachedsession()).toBe(WANIX_ZEDSYNC_TASK_ID)
  })

  it('keeps zedcafe attachable after detach then close', () => {
    registerwanixtermsessionopen(WANIX_ZEDCAFE_TASK_ID)
    setattachedsession(WANIX_ZEDCAFE_TASK_ID)
    detachwanixterm()
    applywanixsessionmessage({
      event: 'close',
      sessionkey: WANIX_ZEDCAFE_TASK_ID,
    })
    expect(readwanixtermbufferkeys()).toContain(WANIX_ZEDCAFE_TASK_ID)
  })

  it('unregisters one-shot session after detach then close', () => {
    registerwanixtermsessionopen('hello-wat')
    setattachedsession('hello-wat')
    detachwanixterm()
    applywanixsessionmessage({ event: 'close', sessionkey: 'hello-wat' })
    expect(readwanixtermbufferkeys()).not.toContain('hello-wat')
  })

  it('does not remove zedsync room task on term close', () => {
    registerdaemonawareprune()
    setwanixroomconfig({
      ...createidleroomconfig(),
      mode: 'task',
      tasks: [
        {
          id: WANIX_ZEDSYNC_TASK_ID,
          cmd: 'zedsync.wasm remote',
          running: true,
        },
      ],
    })
    applywanixsessionmessage({
      event: 'close',
      sessionkey: WANIX_ZEDSYNC_TASK_ID,
    })
    expect(
      readwanixroomconfig().tasks.some(
        (task) => task.id === WANIX_ZEDSYNC_TASK_ID,
      ),
    ).toBe(true)
  })

  it('removes one-shot room task on term close', () => {
    registerdaemonawareprune()
    setwanixroomconfig({
      ...createidleroomconfig(),
      mode: 'task',
      tasks: [{ id: 'hello-wat', cmd: 'hello-wat.wasm', running: true }],
    })
    applywanixsessionmessage({ event: 'close', sessionkey: 'hello-wat' })
    expect(
      readwanixroomconfig().tasks.some((task) => task.id === 'hello-wat'),
    ).toBe(false)
  })
})
