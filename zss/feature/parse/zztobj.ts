import { api_toast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent } from 'zss/mapping/types'
import { memoryreadfirstcontentbook } from 'zss/memory'
import { bookwritecodepage } from 'zss/memory/book'
import { codepagereadname, createcodepage } from 'zss/memory/codepage'

export function parsezztobj(player: string, content: string) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    return
  }

  const codepage = createcodepage(content, {})
  const codepagename = codepagereadname(codepage)

  bookwritecodepage(contentbook, codepage)
  api_toast(
    SOFTWARE,
    player,
    `imported zzt obj file ${codepagename} into ${contentbook.name} book`,
  )
}
