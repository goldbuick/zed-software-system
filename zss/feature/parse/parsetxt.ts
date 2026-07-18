import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { ispresent } from 'zss/mapping/types'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagename,
  memoryreadcodepagestatsfromtext,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memoryreadfirstcontentbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

function txtbasename(filename: string): string {
  const base = filename.replace(/\.(txt|ini)$/i, '').trim()
  return base.length > 0 ? base : 'notes'
}

export function parsetxt(player: string, filename: string, content: string) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    return
  }

  const stats = memoryreadcodepagestatsfromtext(content)
  const alreadytxt =
    stats.type === CODE_PAGE_TYPE.TXT && ispresent(stats.name) && stats.name !== ''
  const withcode = alreadytxt
    ? content
    : `@txt ${txtbasename(filename)}\n${content}`

  const codepage = memorycreatecodepage(withcode, {})
  const codepagename = memoryreadcodepagename(codepage)

  memorywritecodepage(contentbook, codepage)
  apitoast(
    SOFTWARE,
    player,
    `imported txt file ${codepagename} into ${contentbook.name} book`,
  )
  const name = memoryreadcodepagename(codepage)
  const type = memoryreadcodepagetypeasstring(codepage)
  write(
    SOFTWARE,
    player,
    `!pageopen ${codepage.id};$blue[${type}]$white ${name}`,
  )
}
