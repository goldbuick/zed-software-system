import {
  iswanixdaemontaskid,
  iswanixvmsessionkey,
  shouldautohalttasksession,
} from 'zss/device/wanixserver/taskidlepolicy'
import { DEFAULT_WANIX_VM_ID } from 'zss/feature/wanix/wanixroomtypes'
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

  it('treats default v86 guest id as a vm session key', () => {
    expect(iswanixvmsessionkey(DEFAULT_WANIX_VM_ID)).toBe(true)
    expect(iswanixvmsessionkey('hello-wat')).toBe(false)
  })

  it('auto-halts one-shot tasks but not daemons or non-task sessions', () => {
    expect(shouldautohalttasksession('task', 'hello-wat')).toBe(true)
    expect(shouldautohalttasksession('task', WANIX_ZEDCAFE_TASK_ID)).toBe(false)
    expect(shouldautohalttasksession('task', WANIX_ZEDSYNC_TASK_ID)).toBe(false)
    expect(shouldautohalttasksession('vm', 'linux-vm')).toBe(false)
  })
})
