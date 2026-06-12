import { def } from './helpers'
import type { TaskDef } from './types'

type ParityFullOpts = {
  render?: string
  test?: string
  extradeps?: string[]
}

/** daisy:build → render → test (optional extra deps before test). */
export function parityfull(
  suite: string,
  opts?: ParityFullOpts,
): TaskDef {
  const render = opts?.render ?? `daisy:${suite}:render`
  const test = opts?.test ?? `daisy:${suite}:test`
  const deps = [
    'daisy:build',
    render,
    ...(opts?.extradeps ?? []),
    test,
  ]
  return def(`daisy:${suite}:test:full`, {
    description: `Build daisy native, render ${suite} stems, run gates`,
    deps,
    tags: ['slow'],
    run: { kind: 'tasks' },
  })
}
