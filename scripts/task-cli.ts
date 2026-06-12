#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'

import { checktasksdoc, writetasksdoc } from '../tasks/docs'
import { getalltasks, gettaskmap, taskidfromsegments } from '../tasks/registry'
import { explaintask, listtasks, runtask } from '../tasks/runner'
import { TASK_GROUPS } from '../tasks/types'
import type { TaskDef } from '../tasks/types'

type Subtree = {
  tasks: TaskDef[]
  children: Map<string, Subtree>
}

function emptysubtree(): Subtree {
  return { tasks: [], children: new Map() }
}

function insertsubtree(root: Subtree, segments: string[], task: TaskDef) {
  if (segments.length === 0) {
    root.tasks.push(task)
    return
  }
  const [head, ...rest] = segments
  if (!head) {
    root.tasks.push(task)
    return
  }
  let child = root.children.get(head)
  if (!child) {
    child = emptysubtree()
    root.children.set(head, child)
  }
  insertsubtree(child, rest, task)
}

function subtreecommand(
  name: string,
  meta: { description?: string },
  subtree: Subtree,
  group: string,
  prefix: string[],
): ReturnType<typeof defineCommand> {
  const subcommands: Record<string, ReturnType<typeof defineCommand>> = {}

  for (const [childname, childtree] of subtree.children.entries()) {
    subcommands[childname] = subtreecommand(
      childname,
      { description: `Tasks under ${[group, ...prefix, childname].join(':')}` },
      childtree,
      group,
      [...prefix, childname],
    )
  }

  for (const task of subtree.tasks) {
    const leafname = task.id.split(':').pop() ?? task.id
    if (subcommands[leafname]) {
      subcommands[`_${leafname}`] = defineCommand({
        meta: {
          name: `_${leafname}`,
          description: `${task.description} (${task.id})`,
        },
        async run() {
          const code = runtask(task.id)
          process.exit(code)
        },
      })
    } else {
      subcommands[leafname] = defineCommand({
        meta: {
          name: leafname,
          description: task.description,
        },
        async run() {
          const code = runtask(task.id)
          process.exit(code)
        },
      })
    }
  }

  return defineCommand({
    meta: {
      name,
      description: meta.description,
    },
    subCommands: subcommands,
    async run({ args }) {
      const segments = [...prefix]
      const extras = (args._ as string[] | undefined) ?? []
      if (extras.length > 0) {
        segments.push(...extras)
      }
      if (segments.length === 0) {
        return
      }
      const id = taskidfromsegments(group, segments)
      if (!gettaskmap()[id]) {
        console.error(`unknown task: ${id}`)
        process.exit(1)
      }
      const code = runtask(id)
      process.exit(code)
    },
  })
}

const RESERVED_SUBCOMMANDS = new Set(['list', 'run', 'explain', 'docs'])

function buildgroupcommands(): Record<string, ReturnType<typeof defineCommand>> {
  const bygroup = new Map<string, TaskDef[]>()
  for (const group of TASK_GROUPS) {
    bygroup.set(group, [])
  }
  for (const task of getalltasks()) {
    const list = bygroup.get(task.group) ?? []
    list.push(task)
    bygroup.set(task.group, list)
  }

  const commands: Record<string, ReturnType<typeof defineCommand>> = {}
  for (const group of TASK_GROUPS) {
    if (RESERVED_SUBCOMMANDS.has(group)) {
      continue
    }
    const tasks = bygroup.get(group) ?? []
    if (tasks.length === 0) {
      continue
    }
    const root = emptysubtree()
    for (const task of tasks) {
      const segments = task.id.split(':').slice(1)
      insertsubtree(root, segments, task)
    }
    commands[group] = subtreecommand(
      group,
      { description: `${group} tasks` },
      root,
      group,
      [],
    )
  }
  return commands
}

const listcmd = defineCommand({
  meta: {
    name: 'list',
    description: 'List tasks (optionally filter by group or tag)',
  },
  args: {
    group: {
      type: 'string',
      description: 'Filter by task group (e.g. app, daisy)',
    },
    tag: {
      type: 'string',
      description: 'Filter by tag (ci, dev, deploy, slow, calibrate)',
    },
  },
  run({ args }) {
    const tasks = listtasks({
      group: args.group,
      tag: args.tag,
    })
    let currentgroup = ''
    for (const task of tasks) {
      if (task.group !== currentgroup) {
        currentgroup = task.group
        console.log(`\n[${currentgroup}]`)
      }
      const tags = task.tags?.length ? ` (${task.tags.join(', ')})` : ''
      console.log(`  ${task.id}${tags}`)
      console.log(`    ${task.description}`)
    }
    console.log('')
  },
})

const runcmd = defineCommand({
  meta: {
    name: 'run',
    description: 'Run a task by id (e.g. app:dev)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task id',
      required: true,
    },
  },
  run({ args }) {
    const positionals = (args._ as string[] | undefined) ?? []
    const extraargs = positionals.slice(1)
    const code = runtask(args.id, extraargs)
    process.exit(code)
  },
})

const explaincmd = defineCommand({
  meta: {
    name: 'explain',
    description: 'Show dependency order and metadata for a task',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Task id',
      required: true,
    },
  },
  run({ args }) {
    const { order, tasks } = explaintask(args.id)
    console.log(`Task: ${args.id}\n`)
    console.log('Execution order:')
    for (const [index, taskid] of order.entries()) {
      const task = tasks[index]
      if (!task) {
        continue
      }
      console.log(`  ${index + 1}. ${taskid}`)
      console.log(`     ${task.description}`)
      if (task.env && Object.keys(task.env).length > 0) {
        console.log(
          `     env: ${Object.entries(task.env)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')}`,
        )
      }
      if (task.deps?.length) {
        console.log(`     deps: ${task.deps.join(', ')}`)
      }
    }
    console.log('')
  },
})

const docscmd = defineCommand({
  meta: {
    name: 'docs',
    description: 'Generate docs/tasks.md (use --check in CI)',
  },
  args: {
    check: {
      type: 'boolean',
      description: 'Exit 1 if docs/tasks.md is out of date',
      default: false,
    },
  },
  run({ args }) {
    if (args.check) {
      if (!checktasksdoc()) {
        console.error('docs/tasks.md is out of date — run: yarn task docs')
        process.exit(1)
      }
      console.log('docs/tasks.md is up to date')
      return
    }
    writetasksdoc()
    console.log('wrote docs/tasks.md')
  },
})

const main = defineCommand({
  meta: {
    name: 'task',
    description: 'ZSS task runner (manifest in tasks/)',
  },
  subCommands: {
    list: listcmd,
    run: runcmd,
    explain: explaincmd,
    docs: docscmd,
    ...buildgroupcommands(),
  },
})

runMain(main)
