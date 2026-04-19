import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { loadcharsetfrombytes } from 'zss/feature/bytes'
import { ispresent } from 'zss/mapping/types'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
  memoryreadcodepagename,
} from 'zss/memory/codepageoperations'
import { memoryensureimportbook } from 'zss/memory/books'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

export function parsechr(
  player: string,
  filename: string,
  content: Uint8Array,
) {
  const contentbook = memoryensureimportbook()

  const code = `@charset ${filename.toLowerCase().replace('.chr', '')}`
  const codepage = memorycreatecodepage(code, {})
  const codepagename = memoryreadcodepagename(codepage)

  const charset = loadcharsetfrombytes(content)
  const codepagecharset =
    memoryreadcodepagedata<CODE_PAGE_TYPE.CHARSET>(codepage)

  if (ispresent(charset) && ispresent(codepagecharset)) {
    Object.assign(codepagecharset, charset)
    memorywritecodepage(contentbook, codepage)
    apitoast(
      SOFTWARE,
      player,
      `imported chr file ${codepagename} into ${contentbook.name} book`,
    )
  }
}
