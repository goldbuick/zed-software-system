import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadboardstatequery } from 'zss/memory/boardstatequery'
import { memoryruncli } from 'zss/memory/runtime'

export type PATHFIND_RESULT = { nextpoint: { x: number; y: number } } | null

export type CODEPAGE_RESULT = { codepage: { id: string; code: string } } | null

export function handlequery(vm: DEVICE, message: MESSAGE): void {
  const payload = message.data
  if (!ispresent(payload) || !isstring(payload.id) || !isstring(payload.type)) {
    return
  }
  const agentid = message.player
  const { id, type } = payload as { id: string; type: string }
  try {
    let result: unknown
    switch (type) {
      case 'boardstate': {
        const out = memoryreadboardstatequery(agentid)
        if ('error' in out) {
          vm.emit(agentid, 'heavy:queryresult', {
            id,
            error: out.error,
          })
          return
        }
        result = out
        break
      }
      case 'runcli': {
        const command = payload.command
        if (!isstring(command)) {
          vm.emit(agentid, 'heavy:queryresult', {
            id,
            error: 'missing_command',
          })
          return
        }
        memoryruncli(agentid, command, false)
        result = { ok: true }
        break
      }
      default:
        vm.emit(agentid, 'heavy:queryresult', {
          id,
          error: 'unknown_type',
        })
        return
    }
    vm.emit(agentid, 'heavy:queryresult', { id, result })
  } catch (err) {
    vm.emit(agentid, 'heavy:queryresult', {
      id,
      error: err instanceof Error ? err.message : 'unknown_error',
    })
  }
}
