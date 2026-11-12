import { apitoast, vmcli, vmcodeaddress } from 'zss/device/api'
import { modemreadtextsync } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import { useEditor, useTape } from 'zss/gadget/data/zustandstores'
import { ispresent } from 'zss/mapping/types'
import { computeselection } from 'zss/screens/editor/editorinputhelpers'
import { findcursorinrows, splitcoderows } from 'zss/screens/tape/common'

/**
 * Run selected editor text, or the current line if there is no selection.
 * Same behavior as editor keyboard meta+p.
 */
export function editorrunmetap(player: string) {
  const editor = useTape.getState().editor
  if (!editor.open || !ispresent(editor.book)) {
    return
  }
  const key = vmcodeaddress(editor.book, editor.path)
  const strvalue = modemreadtextsync(key)
  const { cursor, select } = useEditor.getState()
  const { hasselection, strvalueselected } = computeselection(
    cursor,
    select,
    strvalue,
  )
  const rows = splitcoderows(strvalue)
  if (rows.length === 0) {
    return
  }
  const ycursor = findcursorinrows(cursor, rows)
  const coderow = rows[ycursor]
  const runtext = hasselection ? strvalueselected : (coderow?.code ?? '')
  if (!runtext.length) {
    return
  }
  vmcli(SOFTWARE, player, runtext)
  apitoast(
    SOFTWARE,
    player,
    `running $WHITE${runtext.substring(0, 16)}...$BLUE`,
  )
}
