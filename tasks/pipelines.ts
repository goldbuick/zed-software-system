import { def } from './helpers'
import type { TaskDef } from './types'

type ParityFullOpts = {
  render?: string
  test?: string
  extradeps?: string[]
}

/** ops:daisy:build → render → test (optional extra deps before test). */
export function parityfull(suite: string, opts?: ParityFullOpts): TaskDef {
  const render = opts?.render ?? `ops:daisy:${suite}:render`
  const test = opts?.test ?? `ops:daisy:${suite}:test`
  const deps = ['ops:daisy:build', render, ...(opts?.extradeps ?? []), test]
  return def(`ops:daisy:${suite}:test:full`, {
    description: `Build daisy native, render ${suite} stems, run gates`,
    deps,
    tags: ['slow'],
    run: { kind: 'tasks' },
  })
}
