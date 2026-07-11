import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
// Drop orchestration stays on the parent (wanixroom.handlewanixdrop).
// Parent emits are not used for this path; parse/file calls wanixroom directly.
export function handledrop(_wanix: DEVICE, _message: MESSAGE): void {}
