/** @jest-environment jsdom */

import {
  appendvmzedcafeexportguestbind,
  appendzedcafeexportguestbind,
  refreshzedcafeexportbinds,
  resetzedcafestate,
} from 'zss/feature/wanix/wanixzedcafehost'
import {
  WANIX_ZEDCAFE_GUEST_MOUNT,
  readwanixzedcafeexportsrc,
} from 'zss/feature/wanix/wanixzedcafeconstants'

describe('wanixzedcafe export guest binds', () => {
  beforeEach(() => {
    resetzedcafestate()
    document.body.replaceChildren()
  })

  it('binds zedcafe/ to #task/rid/export on wanix-system', () => {
    const sys = document.createElement('wanix-system')
    document.body.appendChild(sys)
    const taskrid = 'task-abc'

    appendzedcafeexportguestbind(sys, taskrid)

    const bind = sys.querySelector(
      'wanix-bind[data-zss-zedcafe-export="guest"]',
    )
    expect(bind).not.toBeNull()
    expect(bind?.getAttribute('dst')).toBe(WANIX_ZEDCAFE_GUEST_MOUNT)
    expect(bind?.getAttribute('src')).toBe(readwanixzedcafeexportsrc(taskrid))
  })

  it('binds zedcafe/ to #task/rid/export on wanix-vm', () => {
    const vm = document.createElement('wanix-vm')
    document.body.appendChild(vm)
    const taskrid = 'task-vm'

    appendvmzedcafeexportguestbind(vm, taskrid)

    const bind = vm.querySelector(
      'wanix-bind[data-zss-zedcafe-export="vm-guest"]',
    )
    expect(bind).not.toBeNull()
    expect(bind?.getAttribute('dst')).toBe(WANIX_ZEDCAFE_GUEST_MOUNT)
    expect(bind?.getAttribute('src')).toBe(readwanixzedcafeexportsrc(taskrid))
  })

  it('refreshzedcafeexportbinds applies system and vm binds', () => {
    const sys = document.createElement('wanix-system')
    const vm = document.createElement('wanix-vm')
    sys.appendChild(vm)
    document.body.appendChild(sys)
    const taskrid = 'task-both'

    const count = refreshzedcafeexportbinds(sys, taskrid)

    expect(count).toBe(2)
    expect(
      sys.querySelector('wanix-bind[data-zss-zedcafe-export="guest"]'),
    ).not.toBeNull()
    expect(
      vm.querySelector('wanix-bind[data-zss-zedcafe-export="vm-guest"]'),
    ).not.toBeNull()
    expect(
      sys.querySelector('wanix-bind[data-zss-zedcafe-export="ramfs"]'),
    ).toBeNull()
    expect(
      vm.querySelector('wanix-bind[data-zss-zedcafe-export="vm-staging"]'),
    ).toBeNull()
  })
})
