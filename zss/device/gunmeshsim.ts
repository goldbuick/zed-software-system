/** Sim-hub gunmesh: opaque Gun.Mesh wire frames → local graph; MEMORY derives from subscriber. */
import { createdevice } from 'zss/device'
import { vm } from 'zss/device/vm'
import {
  gunsyncparsesimmeshwire,
  gunsyncsimmeshhearwireframe,
  gunsyncstarsimsubscriber,
} from 'zss/feature/gunsync/replicasubscriber'

let subscribed = false

const gunmeshsim = createdevice('gunmesh', ['all'], (message) => {
  if (!gunmeshsim.session(message)) {
    return
  }
  if (message.target !== 'memory') {
    return
  }
  if (!subscribed) {
    subscribed = true
    gunsyncstarsimsubscriber(vm)
  }
  const raw = gunsyncparsesimmeshwire(message.data)
  if (!(typeof raw === 'string' && raw.length > 0)) {
    return
  }
  gunsyncsimmeshhearwireframe(vm, message.player, raw)
})

void gunmeshsim
