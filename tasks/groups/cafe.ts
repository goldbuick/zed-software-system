import { def, exec, handler, shell, tasksonly } from '../helpers'
import type { TaskDef } from '../types'

export const CAFE_TASKS: TaskDef[] = [
  def('cafe:install', {
    description: 'Install yarn dependencies',
    run: exec(['yarn']),
  }),
  def('cafe:vite:dev', {
    description: 'Start Vite dev server on port 7777',
    tags: ['dev'],
    run: exec(['vite', '--host', '0.0.0.0', '--port', '7777']),
  }),
  tasksonly(
    'cafe:dev',
    'Install deps and start Vite dev server',
    ['cafe:install', 'cafe:vite:dev'],
    {
      tags: ['dev'],
    },
  ),
  tasksonly(
    'cafe:dev:no-sc',
    'Dev server with play-bus sidechain bypassed',
    ['cafe:dev'],
    {
      tags: ['dev'],
      env: { ZSS_DAISY_NO_SIDECHAIN: '1' },
    },
  ),
  def('cafe:build', {
    description: 'Production Vite build',
    tags: ['ci'],
    run: exec(['vite', 'build']),
  }),
  def('cafe:build:strict', {
    description: 'Typecheck then production Vite build',
    run: shell('tsc && vite build'),
  }),
  def('cafe:analyze', {
    description: 'Production build with bundle analyzer',
    env: {
      NODE_OPTIONS: '--max-old-space-size=8192',
      ZSS_ANALYZER: '1',
    },
    run: exec(['vite', 'build']),
  }),
  def('cafe:clear', {
    description: 'Remove build artifacts and Vite cache',
    run: shell(
      'rimraf tmp && rimraf dist && rimraf headless/dist && rimraf cafe/dist && rimraf node_modules/.vite',
    ),
  }),
  def('cafe:preview', {
    description: 'Preview production build on port 7777',
    tags: ['dev'],
    run: exec(['vite', 'preview', '--host', '0.0.0.0', '--port', '7777']),
  }),
  def('cafe:playwright:headed', {
    description:
      'Run a headed Playwright script against an already-running dev server (--url required)',
    tags: ['dev'],
    run: handler(async (ctx) => {
      const { runheadedplaywrightscript } =
        await import('tasks/lib/playwright/runheadedscript')
      return runheadedplaywrightscript(
        ctx.root,
        'cafe:playwright:headed',
        ctx.args,
      )
    }),
  }),
]
