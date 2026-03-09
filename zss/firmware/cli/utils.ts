/**
 * Shared CLI helpers: parsing and formatting used by multiple command modules.
 */
import { vmflush } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { memoryreadcodepagestat } from 'zss/memory/codepageoperations'
import { memoryreadoperator } from 'zss/memory/session'
import { CODE_PAGE } from 'zss/memory/types'

export function isemail(email: string) {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.exec(
    String(email).toLowerCase(),
  )
}

export function codepagepicksuffix(codepage: MAYBE<CODE_PAGE>): string {
  const pickstat = memoryreadcodepagestat(codepage, 'pick')
  return ispresent(pickstat) ? `$green pick ${maptostring(pickstat)}` : ''
}

export function vmflushop() {
  vmflush(SOFTWARE, memoryreadoperator())
}
