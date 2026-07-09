/** @jest-environment jsdom */

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  readzedcafeexportstatscontentready: jest.fn(() => false),
}))

import {
  haltzedcafetask,
  readzedcafetaskridlocal,
  resetzedcafestate,
  synczedcafestate,
} from 'zss/feature/wanix/wanixzedcafehost'
import { WANIX_ZEDCAFE_TASK_ID } from 'zss/feature/wanix/wanixzedcafeconstants'
import type { WanixSystemElement } from 'zss/feature/wanix/wanixelements.d.ts'

type MockTask = HTMLElement & { rid?: string | null }

function mocksystem(): WanixSystemElement {
  const sys = document.createElement('wanix-system') as WanixSystemElement
  document.body.appendChild(sys)
  return sys
}

function mountzedcafetask(sys: WanixSystemElement, rid: string): MockTask {
  const task = document.createElement('wanix-task') as MockTask
  task.id = WANIX_ZEDCAFE_TASK_ID
  task.rid = rid
  sys.appendChild(task)
  return task
}

describe('readzedcafetaskridlocal', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    resetzedcafestate()
  })

  it('returns null after halt removes zedcafe task', () => {
    const sys = mocksystem()
    mountzedcafetask(sys, '9')
    expect(readzedcafetaskridlocal(sys)).toBe('9')
    synczedcafestate('zedcafe.wasm', 1)
    haltzedcafetask(sys)
    expect(readzedcafetaskridlocal(sys)).toBeNull()
  })

  it('reconciles rid from mounted task when local cache was cleared', () => {
    const sys = mocksystem()
    mountzedcafetask(sys, '12')
    synczedcafestate('zedcafe.wasm', 1)
    expect(readzedcafetaskridlocal(sys)).toBe('12')
  })
})
