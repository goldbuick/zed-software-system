import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import type { SCRIPT_PATCH_MODE } from 'zss/feature/heavy/llm/scripttool'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryquerycodepage,
  memoryquerycompilescript,
  memoryquerywritescript,
} from 'zss/memory/agentscriptquery'
import { memoryreadboardstatequery } from 'zss/memory/boardstatequery'

export type PATHFIND_RESULT = { nextpoint: { x: number; y: number } } | null

export type CODEPAGE_RESULT = { id: string; name: string; code: string }

function ispatchmode(v: unknown): v is SCRIPT_PATCH_MODE {
  return v === 'append' || v === 'replace_handler' || v === 'replace_all'
}

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
      case 'compilescript': {
        const name = payload.name
        const text = payload.text
        if (!isstring(name) || !isstring(text)) {
          vm.emit(agentid, 'heavy:queryresult', {
            id,
            error: 'missing_text',
          })
          return
        }
        result = memoryquerycompilescript(name, text)
        break
      }
      case 'codepage': {
        const pageid = payload.page_id
        if (!isstring(pageid)) {
          vm.emit(agentid, 'heavy:queryresult', {
            id,
            error: 'missing_page_id',
          })
          return
        }
        const page = memoryquerycodepage(pageid)
        if ('error' in page) {
          vm.emit(agentid, 'heavy:queryresult', {
            id,
            error: page.error,
          })
          return
        }
        result = page
        break
      }
      case 'writescript': {
        const pageid = payload.page_id
        const snippet = payload.snippet
        const mode = payload.mode
        if (!isstring(pageid) || !isstring(snippet)) {
          vm.emit(agentid, 'heavy:queryresult', {
            id,
            error: 'missing_fields',
          })
          return
        }
        const patchmode: SCRIPT_PATCH_MODE = ispatchmode(mode) ? mode : 'append'
        const compileonly = payload.compile_only === true
        if (compileonly) {
          result = memoryquerycompilescript(pageid, snippet)
          break
        }
        const writeresult = memoryquerywritescript(
          agentid,
          pageid,
          snippet,
          patchmode,
        )
        if (!writeresult.ok && writeresult.error === 'compile_failed') {
          const compiled = memoryquerycompilescript(pageid, snippet)
          result = {
            ok: false,
            error: 'compile_failed',
            errors: compiled.errors,
          }
          break
        }
        result = writeresult
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
