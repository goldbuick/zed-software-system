import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { wanixexportstate } from 'zss/device/api'
import { buildzedcafeexportfiles } from 'zss/feature/wanix/wanixstateexport'
import { validatezedcafeexportpaths } from 'zss/feature/wanix/zedcafetreeschema'

export function handleexportzedcafe(vm: DEVICE, message: MESSAGE): void {
  const files = buildzedcafeexportfiles()
  const check = validatezedcafeexportpaths(files)
  if (!check.ok) {
    const detail = check.errors[0] ?? 'unknown'
    console.error(`zedcafe export: invalid tree — ${detail}`)
    return
  }
  wanixexportstate(vm, message.player, files)
}
