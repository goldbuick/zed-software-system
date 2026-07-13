import { createRoot } from 'react-dom/client'
import 'zss/rom/vitepopulate'
import { vmcli } from 'zss/device/api'
import { register } from 'zss/device/register'
import { registersetmyplayerid } from 'zss/device/register/player'
import { registerreadplayer } from 'zss/device/registerplayer'
import 'zss/device/wanixclient'
import { isclimode } from 'zss/feature/detect'
import {
  durablehydratefromdisk,
  startdurableclisync,
} from 'zss/feature/durablecli'
import { isjoin } from 'zss/feature/url'
import { createplatform } from 'zss/platform'
import { WanixHost } from 'zss/screens/wanix/host'

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
  await durablehydratefromdisk()
  createplatform(isjoin(), true)
  startdurableclisync()
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
      <WanixHost />
    </WebGLCheck>,
  )
}

main().catch(console.error)
