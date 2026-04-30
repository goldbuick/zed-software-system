/** Sim-hub gunmesh: apply Gunsync wire + optionally push same payload to boardrunner worker. */
import { createdevice } from 'zss/device'
import { vm } from 'zss/device/vm'
import { gunmeshonmemory } from 'zss/feature/gunsync'
import type { GunsyncPayload } from 'zss/feature/gunsync/replica'
import { ispresent } from 'zss/mapping/types'

const gunmeshsim = createdevice('gunmesh', ['all'], (message) => {
  if (!gunmeshsim.session(message)) {
    return
  }
  if (message.target !== 'memory') {
    return
  }
  const data = message.data as GunsyncPayload | undefined
  if (!ispresent(data)) {
    return
  }
  gunmeshonmemory(vm, message.player, data)
})

void gunmeshsim
