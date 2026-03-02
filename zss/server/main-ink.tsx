/**
 * CLI Server entry point with Ink terminal UI.
 * Headless ZSS simulation with a React-based terminal interface.
 * Requires a TTY (run in an interactive terminal).
 */
import React from 'react'
import { render } from 'ink'
import { sessionreset, vmcli } from 'zss/device/api'
import {
  registerreadplayer,
  registerserver,
  setServerLogOutput,
} from 'zss/device/registerserver'
import { SOFTWARE } from 'zss/device/session'
import { ensureRomReady } from 'zss/feature/rom'
import { createplatformserver } from 'zss/server/platform-server'
import { ServerApp } from './app'

sessionreset(SOFTWARE)

function App() {
  const handleSubmit = (line: string) => {
    const playerid = registerreadplayer()
    vmcli(registerserver, playerid, line)
  }

  const handleLogOutput = (fn: (line: string) => void) => {
    setServerLogOutput(fn)
  }

  const handleReady = async () => {
    await ensureRomReady()
    createplatformserver()
  }

  return (
    <ServerApp
      onSubmit={handleSubmit}
      onLogOutput={handleLogOutput}
      onReady={handleReady}
    />
  )
}

if (!process.stdin.isTTY) {
  console.error('Ink UI requires an interactive terminal (TTY).')
  process.exit(1)
}

const app = render(<App />)
app.waitUntilExit().then(() => {
  process.exit(0)
})
