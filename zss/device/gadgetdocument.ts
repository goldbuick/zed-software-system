/*
JSON helpers for gadget snapshots (no RxDB).
*/
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { MAYBE } from 'zss/mapping/types'

/** JSON snapshot of gadget state; `undefined` if serialization fails. */
export function gadgetdocumentjson(gadget: GADGET_STATE): string | undefined {
  try {
    return JSON.stringify(gadget)
  } catch {
    return undefined
  }
}

/** Parse gadget JSON from wire. */
export function parsegadgetdocumentjson(raw: string): MAYBE<GADGET_STATE> {
  try {
    return JSON.parse(raw) as GADGET_STATE
  } catch {
    return undefined
  }
}
