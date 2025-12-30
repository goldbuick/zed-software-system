import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { loadcharsetfrombytes } from 'zss/feature/bytes'
import { ispresent } from 'zss/mapping/types'
import { memoryreadfirstcontentbook } from 'zss/memory'
import { memorybookwritecodepage } from 'zss/memory/bookoperations'
import {
  memorycodepagereaddata,
  memorycodepagereadname,
  memorycreatecodepage,
} from 'zss/memory/codepageoperations'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

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
  const codepage = memorycreatecodepage(code, {})
  const codepagename = memorycodepagereadname(codepage)

  const charset = loadcharsetfrombytes(content)
  const codepagecharset =
    memorycodepagereaddata<CODE_PAGE_TYPE.CHARSET>(codepage)

  if (ispresent(charset) && ispresent(codepagecharset)) {
    Object.assign(codepagecharset, charset)
    memorybookwritecodepage(contentbook, codepage)
    apitoast(
      SOFTWARE,
      player,
      `imported chr file ${codepagename} into ${contentbook.name} book`,
    )
  }
}
