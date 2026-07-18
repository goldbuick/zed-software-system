import type { WanixSessionKind } from 'zss/device/wanixserver/state'
import { DEFAULT_WANIX_VM_ID } from 'zss/feature/wanix/wanixroomtypes'
import {
  WANIX_ZEDCAFE_TASK_ID,
  WANIX_ZEDSYNC_TASK_ID,
} from 'zss/feature/wanix/wanixzedcafeconstants'

/** Daemons that may go quiet on the term while still doing work. */
export function iswanixdaemontaskid(sessionkey: string): boolean {
  if (sessionkey === WANIX_ZEDCAFE_TASK_ID) {
    return true
  }
  return (
    sessionkey === WANIX_ZEDSYNC_TASK_ID ||
    sessionkey.startsWith(`${WANIX_ZEDSYNC_TASK_ID}-`)
  )
}

/** v86 guest term — EOF/close is not VM death; keep attach keys after detach. */
export function iswanixvmsessionkey(sessionkey: string): boolean {
  return sessionkey === DEFAULT_WANIX_VM_ID
}

/**
 * Auto-halt only applies to one-shot dropped tasks. Long-running daemons
 * (zedcafe export, zedsync watch) are exempt — quiet term I/O is normal.
 */
export function shouldautohalttasksession(
  kind: WanixSessionKind | undefined,
  sessionkey: string,
): boolean {
  return kind === 'task' && !iswanixdaemontaskid(sessionkey)
}
