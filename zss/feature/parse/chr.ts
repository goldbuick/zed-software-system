import { api_toast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent } from 'zss/mapping/types'
import { memoryreadfirstcontentbook } from 'zss/memory'
import { bookwritecodepage } from 'zss/memory/book'
import {
  codepagereaddata,
  codepagereadname,
  createcodepage,
} from 'zss/memory/codepage'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

import { loadcharsetfrombytes } from '../bytes'

export function parsechr(
  player: string,
  filename: string,
  content: Uint8Array,
) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    return
  }

  const code = `@charset ${filename.toLowerCase().replace('.chr', '')}`
  const codepage = createcodepage(code, {})
  const codepagename = codepagereadname(codepage)

  const charset = loadcharsetfrombytes(content)
  const codepagecharset = codepagereaddata<CODE_PAGE_TYPE.CHARSET>(codepage)

  if (ispresent(charset) && ispresent(codepagecharset)) {
    Object.assign(codepagecharset, charset)
    bookwritecodepage(contentbook, codepage)
    api_toast(
      SOFTWARE,
      player,
      `imported chr file ${codepagename} into ${contentbook.name} book`,
    )
  }
}
