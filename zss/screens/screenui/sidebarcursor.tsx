import { useWriteText } from 'zss/gadget/writetext'
import { writerowchevrons } from 'zss/screens/panel/activerow'

/** Side chevrons for the selected sidebar row (no marquee +2). */
export function SidebarCursor({ row }: { row: number }) {
  const context = useWriteText()
  writerowchevrons(context, row, 0, context.width - 1)
  return null
}
