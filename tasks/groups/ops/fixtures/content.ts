import { readdirSync } from 'node:fs'
import path from 'node:path'

import { def, handler, jestexec } from '../../../helpers'
import type { TaskContext, TaskDef } from '../../../types'
import { runjest, spawntask } from 'tasks/shellutil'

function runcontentcli(ctx: TaskContext): number {
  const task = ctx.args[0]
  const arg = ctx.args[1] ?? ''
  const extra = ctx.args.slice(2)
  if (!task || !arg) {
    process.stderr.write(
      'usage: <build|validate|codepage-validate> <path> [--out ...]\n',
    )
    return 1
  }
  return runjest(
    ctx,
    'ops/tests/unit/feature/content/contentbook.cli.test.ts',
    ['--no-coverage', '--runTestsByPath'],
    {
      env: {
        CONTENT_CLI_TASK: task,
        CONTENT_CLI_ARG: arg,
        CONTENT_CLI_EXTRA: JSON.stringify(extra),
      },
    },
  )
}

function runcontentbookbuildall(ctx: TaskContext): number {
  const templatesdir = path.join(ctx.root, 'ops/fixtures/content/templates')
  const names = readdirSync(templatesdir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  if (names.length === 0) {
    process.stderr.write(`no templates under ${templatesdir}\n`)
    return 1
  }
  for (const name of names) {
    const templatepath = `ops/fixtures/content/templates/${name}`
    const code = spawntask(
      'yarn',
      ['task', 'run', 'ops:fixtures:content:book:build', templatepath],
      ctx,
      { inherit: true },
    )
    if (code !== 0) {
      return code
    }
  }
  return 0
}

export const OPS_FIXTURES_CONTENT_TASKS: TaskDef[] = [
  def('ops:fixtures:content:book:build:all', {
    description:
      'Build importable book JSON for every template under ops/fixtures/content/templates/',
    run: handler(runcontentbookbuildall),
  }),
  def('ops:fixtures:content:book:build', {
    description:
      'Build importable book JSON from template path (pass path as extra args)',
    run: handler((ctx) =>
      runcontentcli({ ...ctx, args: ['build', ...ctx.args] }),
    ),
  }),
  def('ops:fixtures:content:book:validate', {
    description: 'Validate book JSON (pass path as extra args)',
    run: handler((ctx) =>
      runcontentcli({ ...ctx, args: ['validate', ...ctx.args] }),
    ),
  }),
  def('ops:fixtures:content:book:test', {
    description: 'Jest content book tests',
    tags: ['ci'],
    run: jestexec('ops/tests/unit/feature/content/contentbook.test.ts', [
      '--no-coverage',
    ]),
  }),
  def('ops:fixtures:content:codepage:validate', {
    description: 'Validate codepage JSON (pass path as extra args)',
    run: handler((ctx) =>
      runcontentcli({ ...ctx, args: ['codepage-validate', ...ctx.args] }),
    ),
  }),
]
