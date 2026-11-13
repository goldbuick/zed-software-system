import { useWriteText } from 'zss/gadget/writetext'
import { writerowchevrons } from 'zss/screens/panel/activerow'

export function ScrollCursor({ row }: { row: number }) {
  const context = useWriteText()
  writerowchevrons(context, row + 2, 1, context.width - 2)
  return null
}
