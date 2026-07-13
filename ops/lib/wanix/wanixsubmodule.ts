import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const WANIX_SUBMODULE_DIR = path.join(process.cwd(), 'submodules', 'wanix')

export const WANIX_ZEDCAFE_DIRTY_FORWARD_PATCH = path.join(
  process.cwd(),
  'ops',
  'patches',
  'wanix-worker-zedcafeexportdirty.patch',
)

export const WANIX_WORKER_GO = path.join(
  WANIX_SUBMODULE_DIR,
  'web',
  'worker',
  'worker.go',
)

/** Marker string the ZSS fork must contain in worker.go / wanix.wasm. */
export const WANIX_ZEDCAFE_DIRTY_FORWARD_MARKER = '__wanixOnZedcafeExportDirty'

const WANIX_ZEDCAFE_DIRTY_APPLY =
  'git -C submodules/wanix apply ../../ops/patches/wanix-worker-zedcafeexportdirty.patch'

/**
 * Ensure submodules/wanix is checked out (go.mod present).
 */
export function requirewanixsubmodule(): void {
  const wanixgomod = path.join(WANIX_SUBMODULE_DIR, 'go.mod')
  if (!existsSync(wanixgomod)) {
    throw new Error(
      `missing ${wanixgomod} — run: git submodule update --init submodules/wanix`,
    )
  }
}

/**
 * True when the checked-out wanix worker forwards zedcafeexportdirty.
 */
export function haswanixzedcafedirtyforward(
  workergo = WANIX_WORKER_GO,
): boolean {
  if (!existsSync(workergo)) {
    return false
  }
  return readFileSync(workergo, 'utf8').includes(
    WANIX_ZEDCAFE_DIRTY_FORWARD_MARKER,
  )
}

/**
 * Fail if the ZSS dirty-forward patch is missing from the submodule checkout.
 * Parent keeps a recoverable copy at ops/patches/wanix-worker-zedcafeexportdirty.patch.
 */
export function requirewanixzedcafedirtyforward(): void {
  requirewanixsubmodule()
  if (haswanixzedcafedirtyforward()) {
    return
  }
  const patchhint = existsSync(WANIX_ZEDCAFE_DIRTY_FORWARD_PATCH)
    ? `apply the recoverable patch, commit in the submodule, then rebuild cafe/public/wanix/wanix.wasm:\n  ${WANIX_ZEDCAFE_DIRTY_APPLY}`
    : 'missing ops/patches/wanix-worker-zedcafeexportdirty.patch — restore from git history'
  throw new Error(
    `submodules/wanix/web/worker/worker.go is missing ${WANIX_ZEDCAFE_DIRTY_FORWARD_MARKER} — ${patchhint}`,
  )
}
