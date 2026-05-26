import { parsetarget } from 'zss/device'
import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apierror, registerpublishmem } from 'zss/device/api'
import { compressedbookstate } from 'zss/device/vm/helpers'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent } from 'zss/mapping/types'
import { memoryreadcodepage } from 'zss/memory/bookoperations'
import {
  memoryreadbookbyaddress,
  memoryreadfirstbook,
  memoryreadoperator,
} from 'zss/memory/session'

export function handlepublish(vm: DEVICE, message: MESSAGE): void {
  doasync(vm, message.player, async () => {
    const operator = memoryreadoperator()
    if (message.player !== operator || !isarray(message.data)) {
      return
    }
    const [target, ...args] = message.data as string[]
    if (target === 'zns-text') {
      const [email, token, znskey, booktarget = '', path = ''] = args
      const lookup = path || booktarget || znskey
      const { target: booklabel, path: pagepath } = parsetarget(lookup)
      let book = memoryreadbookbyaddress(booklabel)
      if (!ispresent(book)) {
        book = memoryreadfirstbook()
      }
      const codepage = memoryreadcodepage(
        book,
        pagepath || lookup,
      )
      if (!ispresent(codepage)) {
        apierror(vm, message.player, 'publish', `codepage not found`)
        return
      }
      const code = codepage.code ?? ''
      registerpublishmem(
        vm,
        message.player,
        code,
        'zns-text',
        email,
        token,
        znskey,
      )
      return
    }
    const content = await compressedbookstate()
    registerpublishmem(vm, message.player, content, ...message.data)
  })
}
