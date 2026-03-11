import { useWriteText } from 'zss/gadget/writetext'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

export function ScrollCursor({ row }: { row: number }) {
  const context = useWriteText()
  context.x = 1
  context.y = row + 2
  tokenizeandwritetextformat(`$DKPURPLE$ONDKBLUE$175`, context, true)
  context.x = context.width - 2
  context.y = row + 2
  tokenizeandwritetextformat(`$DKPURPLE$ONDKBLUE$174`, context, true)
  return null
}
