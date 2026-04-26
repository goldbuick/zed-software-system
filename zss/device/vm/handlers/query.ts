import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { isarray, isstring } from 'zss/mapping/types'
import { memoryreadboardstatequery } from 'zss/memory/boardstatequery'
import { memoryruncli } from 'zss/memory/runtime'

export type PATHFIND_RESULT = { nextpoint: { x: number; y: number } } | null

export type CODEPAGE_RESULT = { codepage: { id: string; code: string } } | null

export function handlequery(vm: DEVICE, message: MESSAGE): void {
  const raw = message.data
  if (
    !isarray(raw) ||
    raw.length < 2 ||
    !isstring(raw[0]) ||
    !isstring(raw[1])
  ) {
    return
  }
  const id = raw[0]
  const type = raw[1]
  const command = raw.length > 2 ? raw[2] : undefined
  const agentid = message.player
  try {
    let result: unknown
    switch (type) {
      case 'boardstate': {
        const out = memoryreadboardstatequery(agentid)
        if ('error' in out) {
          vm.emit(agentid, 'heavy:queryresult', [id, undefined, out.error])
          return
        }
        result = out
        break
      }
      case 'runcli': {
        if (!isstring(command)) {
          vm.emit(agentid, 'heavy:queryresult', [
            id,
            undefined,
            'missing_command',
          ])
          return
        }
        memoryruncli(agentid, command, false)
        result = { ok: true }
        break
      }
      default:
        vm.emit(agentid, 'heavy:queryresult', [id, undefined, 'unknown_type'])
        return
    }
    vm.emit(agentid, 'heavy:queryresult', [id, result])
  } catch (err) {
    vm.emit(agentid, 'heavy:queryresult', [
      id,
      undefined,
      err instanceof Error ? err.message : 'unknown_error',
    ])
  }
}
