import { createRoot } from 'react-dom/client'
import 'zss/rom/vitepopulate'
import { vmcli } from 'zss/device/api'
import {
  register,
  registerreadplayer,
  registersetmyplayerid,
} from 'zss/device/register'
import { isclimode } from 'zss/feature/detect'
import { isjoin } from 'zss/feature/url'
import { WanixSystem } from 'zss/feature/wanix/wanixsystem'
import { createplatform } from 'zss/platform'

import { CafeCanvas } from './cafecanvas'
import { WebGLCheck } from './webglcheck'

async function bootheadless(): Promise<void> {
  const g = globalThis as any
  const readplayer = g.__nodeStorageReadPlayer
  if (typeof readplayer === 'function') {
    const playerId = await readplayer()
    registersetmyplayerid(playerId)
  }
  g.__onCliInput = (line: string) => {
    vmcli(register, registerreadplayer(), line)
  }
  await import('zss/userspace')
  createplatform(isjoin(), true)
  g.__nodeReady?.()
}

async function main() {
  if (isclimode()) {
    await bootheadless()
    return
  }

  await import('zss/userspace')

  const frame = document.getElementById('frame')
  if (!frame) {
    return
  }

  createRoot(frame).render(
    <WebGLCheck>
      <CafeCanvas />
      <WanixSystem />
    </WebGLCheck>,
  )
}

main().catch(console.error)
