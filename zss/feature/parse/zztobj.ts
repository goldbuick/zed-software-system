import { api_toast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent } from 'zss/mapping/types'
import { memoryreadfirstcontentbook } from 'zss/memory'
import { bookwritecodepage } from 'zss/memory/book'
import {
  codepagereadname,
  codepagereadstatsfromtext,
  createcodepage,
} from 'zss/memory/codepage'

export function parsezztobj(player: string, filename: string, content: string) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    return
  }

  // pre-parse for stats
  const stats = codepagereadstatsfromtext(content).flat

  const withcode = stats.name
    ? content
    : `@${filename.toLowerCase().replace('.obj', '')}\n${content}`

  const codepage = createcodepage(withcode, {})
  const codepagename = codepagereadname(codepage)

  bookwritecodepage(contentbook, codepage)
  api_toast(
    SOFTWARE,
    player,
    `imported zzt obj file ${codepagename} into ${contentbook.name} book`,
  )
}
