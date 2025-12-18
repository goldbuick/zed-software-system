import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent } from 'zss/mapping/types'
import { memoryreadfirstcontentbook } from 'zss/memory'
import { bookwritecodepage } from 'zss/memory/book'
import {
  codepagereadname,
  codepagereadstatsfromtext,
  createcodepage,
} from 'zss/memory/codepage'

import { zztoop } from './zztoop'

export function parsezztobj(player: string, filename: string, content: string) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    return
  }

  // pre-parse for stats
  const stats = codepagereadstatsfromtext(content)

  const withcode = stats.name
    ? content
    : `@${filename.toLowerCase().replace('.obj', '')}\n${content}`

  const codepage = createcodepage(zztoop(withcode), {})
  const codepagename = codepagereadname(codepage)

  bookwritecodepage(contentbook, codepage)
  apitoast(
    SOFTWARE,
    player,
    `imported zzt obj file ${codepagename} into ${contentbook.name} book`,
  )
}
