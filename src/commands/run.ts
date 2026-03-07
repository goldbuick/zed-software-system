import { Command, Flags } from '@oclif/core'

import { runApp } from '../lib/app.js'

export default class Run extends Command {
  static description = 'Run the ZSS CLI (interactive cafe app in Playwright)'

  static flags = {
    port: Flags.integer({
      description: 'HTTP port for the static server',
      default: 7777,
      env: 'ZSS_SERVER_PORT',
    }),
    dev: Flags.boolean({
      description:
        'Use existing Vite dev server (e.g. yarn dev) instead of serving cafe/dist',
      default: false,
      env: 'ZSS_DEV',
    }),
    'data-dir': Flags.string({
      description: 'Data directory for player content, config, etc.',
      default: '.zss-data',
      env: 'ZSS_DATA_DIR',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Run)
    await runApp(flags)
  }
}
