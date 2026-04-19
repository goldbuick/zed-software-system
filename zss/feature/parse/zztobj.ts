import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagename,
  memoryreadcodepagestatsfromtext,
} from 'zss/memory/codepageoperations'
import { memoryensureimportbook } from 'zss/memory/books'

import { zztoop } from './zztoop'

export function parsezztobj(player: string, filename: string, content: string) {
  const contentbook = memoryensureimportbook()

  // pre-parse for stats
  const stats = memoryreadcodepagestatsfromtext(content)

  const withcode = stats.name
    ? content
    : `@${filename.toLowerCase().replace('.obj', '')}\n${content}`

  const codepage = memorycreatecodepage(zztoop(withcode), {})
  const codepagename = memoryreadcodepagename(codepage)

  memorywritecodepage(contentbook, codepage)
  apitoast(
    SOFTWARE,
    player,
    `imported zzt obj file ${codepagename} into ${contentbook.name} book`,
  )
}
