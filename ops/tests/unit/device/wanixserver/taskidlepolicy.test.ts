import {
  iswanixdaemontaskid,
  shouldautohalttasksession,
} from 'zss/device/wanixserver/taskidlepolicy'
import {
  WANIX_ZEDCAFE_TASK_ID,
  WANIX_ZEDSYNC_TASK_ID,
} from 'zss/feature/wanix/wanixzedcafeconstants'

describe('taskidlepolicy', () => {
  it('treats zedcafe and zedsync as daemon task ids', () => {
    expect(iswanixdaemontaskid(WANIX_ZEDCAFE_TASK_ID)).toBe(true)
    expect(iswanixdaemontaskid(WANIX_ZEDSYNC_TASK_ID)).toBe(true)
    expect(iswanixdaemontaskid(`${WANIX_ZEDSYNC_TASK_ID}-2`)).toBe(true)
    expect(iswanixdaemontaskid('hello-wat')).toBe(false)
  })

  it('auto-halts one-shot tasks but not daemons or non-task sessions', () => {
    expect(shouldautohalttasksession('task', 'hello-wat')).toBe(true)
    expect(shouldautohalttasksession('task', WANIX_ZEDCAFE_TASK_ID)).toBe(false)
    expect(shouldautohalttasksession('task', WANIX_ZEDSYNC_TASK_ID)).toBe(false)
    expect(shouldautohalttasksession('vm', 'linux-vm')).toBe(false)
  })
})
