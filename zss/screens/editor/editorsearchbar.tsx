import { useEditorSearch } from 'zss/gadget/data/state'
import { useWriteText } from 'zss/gadget/writetext'
import { setupeditoritem } from 'zss/screens/tape/common'
import {
  textformatreadedges,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

type EditorSearchBarProps = {
  searchmatches: number[]
}

export function EditorSearchBar({ searchmatches }: EditorSearchBarProps) {
  const context = useWriteText()
  textformatreadedges(context)
  const searchquery = useEditorSearch((s) => s.searchquery)
  const searchmatchindex = useEditorSearch((s) => s.searchmatchindex)
  const matchcount = searchmatches.length

  setupeditoritem(false, false, 0, 2, context, 1, 2, 1)
  context.active.color = COLOR.WHITE
  const hint = `$greenFind:$white ${searchquery || '(type to search)'}  $blueF3$white Next  $blueShift+F3$white Prev  $blueEsc$white Close${matchcount > 0 ? `  ${searchmatchindex + 1}/${matchcount}` : ''}`
  tokenizeandwritetextformat(hint, context, true)

  return null
}
