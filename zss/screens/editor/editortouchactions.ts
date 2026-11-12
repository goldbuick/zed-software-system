import { apierror, vmcodeaddress } from 'zss/device/api'
import {
  marknextpatchaslocal,
  modemgetsharedtexthandle,
  setcursorbeforeedit,
  type SharedTextHandle,
} from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import { useEditor, useTape } from 'zss/gadget/data/zustandstores'
import { ispresent } from 'zss/mapping/types'
import {
  computeselection,
  normalizelineendings,
} from 'zss/screens/editor/editorinputhelpers'

/**
 * Clipboard cut/copy/paste for ActionRow.
 * Must run inside the pointer gesture — synthetic hotkeys are not trusted
 * for navigator.clipboard on mobile Safari/Chrome.
 */

function readeditorcodepage(): {
  key: string
  codepage: SharedTextHandle
} | null {
  const editor = useTape.getState().editor
  if (!editor.open || !ispresent(editor.book)) {
    return null
  }
  const key = vmcodeaddress(editor.book, editor.path)
  const codepage = modemgetsharedtexthandle(key)
  if (!ispresent(codepage)) {
    return null
  }
  return { key, codepage }
}

function editorsplice(
  codepage: SharedTextHandle,
  index: number,
  count: number,
  insert?: string,
) {
  setcursorbeforeedit(codepage.nodeId.key, index)
  marknextpatchaslocal()
  if (count > 0 || ispresent(insert)) {
    codepage.splice(index, count, insert)
  }
  const cursor = index + (insert ?? '').length
  useEditor.setState({ cursor, select: undefined })
}

export function editorcopy(player: string) {
  const ctx = readeditorcodepage()
  if (!ctx) {
    return
  }
  const { cursor, select } = useEditor.getState()
  const { strvalueselected } = computeselection(
    cursor,
    select,
    ctx.codepage.toJSON(),
  )
  const clipboard = withclipboard()
  if (!ispresent(clipboard)) {
    return
  }
  clipboard
    .writeText(strvalueselected)
    .catch((err) => apierror(SOFTWARE, player, 'clipboard', err))
}

export function editorcut(player: string) {
  const ctx = readeditorcodepage()
  if (!ctx) {
    return
  }
  const { cursor, select } = useEditor.getState()
  const { hasselection, strvalueselected, ii1, iic } = computeselection(
    cursor,
    select,
    ctx.codepage.toJSON(),
  )
  if (!hasselection) {
    return
  }
  const clipboard = withclipboard()
  if (!ispresent(clipboard)) {
    return
  }
  clipboard
    .writeText(strvalueselected)
    .then(() => {
      editorsplice(ctx.codepage, ii1, iic)
    })
    .catch((err) => apierror(SOFTWARE, player, 'clipboard', err))
}

export function editorpaste(player: string) {
  const ctx = readeditorcodepage()
  if (!ctx) {
    return
  }
  const clipboard = withclipboard()
  if (!ispresent(clipboard)) {
    return
  }
  clipboard
    .readText()
    .then((text) => {
      const cleantext = normalizelineendings(text)
      const { cursor, select } = useEditor.getState()
      const { hasselection, ii1, iic } = computeselection(
        cursor,
        select,
        ctx.codepage.toJSON(),
      )
      if (hasselection) {
        editorsplice(ctx.codepage, ii1, iic, cleantext)
      } else {
        editorsplice(ctx.codepage, cursor, 0, cleantext)
      }
    })
    .catch((err) => apierror(SOFTWARE, player, 'clipboard', err))
}
