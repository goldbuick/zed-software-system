import {
  wanixserveragentexporttree,
  wanixserveragentexportwrite,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'

const AGENT_IO_TIMEOUT_MS = 30_000

export type AGENT_EXPORT_FILE = {
  path: string
  data: number[]
}

type TreeWaiter = {
  resolve: (files: AGENT_EXPORT_FILE[]) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

type WriteWaiter = {
  resolve: () => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

let treewaiter: TreeWaiter | null = null
let writewaiter: WriteWaiter | null = null

export function resolveagentexporttree(data: unknown): void {
  if (!treewaiter) {
    return
  }
  const waiter = treewaiter
  treewaiter = null
  clearTimeout(waiter.timer)
  if (
    data &&
    typeof data === 'object' &&
    (data as { ok?: unknown }).ok === false
  ) {
    waiter.reject(
      new Error(
        String((data as { error?: string }).error ?? 'agent export tree failed'),
      ),
    )
    return
  }
  const files =
    data && typeof data === 'object' && Array.isArray((data as { files?: unknown }).files)
      ? ((data as { files: AGENT_EXPORT_FILE[] }).files)
      : Array.isArray(data)
        ? (data as AGENT_EXPORT_FILE[])
        : []
  waiter.resolve(files)
}

export function resolveagentexportwrite(data: unknown): void {
  if (!writewaiter) {
    return
  }
  const waiter = writewaiter
  writewaiter = null
  clearTimeout(waiter.timer)
  if (
    data &&
    typeof data === 'object' &&
    (data as { ok?: unknown }).ok === false
  ) {
    waiter.reject(
      new Error(
        String(
          (data as { error?: string }).error ?? 'agent export write failed',
        ),
      ),
    )
    return
  }
  waiter.resolve()
}

export async function agentfetchzedcafetree(
  player: string,
): Promise<AGENT_EXPORT_FILE[]> {
  if (treewaiter) {
    throw new Error('agent export tree: concurrent request')
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      treewaiter = null
      reject(new Error('agent export tree: timed out'))
    }, AGENT_IO_TIMEOUT_MS)
    treewaiter = { resolve, reject, timer }
    wanixserveragentexporttree(SOFTWARE, player)
  })
}

export async function agentwritezedcafefile(
  player: string,
  path: string,
  bytes: number[],
): Promise<void> {
  if (writewaiter) {
    throw new Error('agent export write: concurrent request')
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      writewaiter = null
      reject(new Error('agent export write: timed out'))
    }, AGENT_IO_TIMEOUT_MS)
    writewaiter = { resolve, reject, timer }
    wanixserveragentexportwrite(SOFTWARE, player, path, bytes)
  })
}

export function resetagentiofortest(): void {
  if (treewaiter) {
    clearTimeout(treewaiter.timer)
    treewaiter = null
  }
  if (writewaiter) {
    clearTimeout(writewaiter.timer)
    writewaiter = null
  }
}
