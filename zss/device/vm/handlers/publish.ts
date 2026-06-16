import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apierror, registerpublishmem } from 'zss/device/api'
import { compressedbookstate } from 'zss/device/vm/helpers'
import { storageshorturl } from 'zss/feature/storage'
import { doasync } from 'zss/mapping/func'
import { isarray } from 'zss/mapping/types'
import { memoryreadoperator } from 'zss/memory/session'

export function handlepublish(vm: DEVICE, message: MESSAGE): void {
  doasync(vm, message.player, async () => {
    const operator = memoryreadoperator()
    if (message.player !== operator || !isarray(message.data)) {
      return
    }
    const [target] = message.data as string[]
    switch (target) {
      case 'itchio': {
        const [, key] = message.data
        const content = await compressedbookstate()
        registerpublishmem(vm, message.player, target, key, content)
        break
      }
      case 'zns-code': {
        const [, email, token, key, content] = message.data
        registerpublishmem(
          vm,
          message.player,
          'zns',
          email,
          token,
          key,
          content,
        )
        break
      }
      case 'zns-bytes': {
        const [, email, token, key] = message.data
        const content = await storageshorturl(message.player)
        registerpublishmem(
          vm,
          message.player,
          'zns',
          email,
          token,
          key,
          content,
        )
        break
      }
      default: {
        apierror(vm, message.player, 'publish', `invalid target: ${target}`)
        return
      }
    }
  })
}
