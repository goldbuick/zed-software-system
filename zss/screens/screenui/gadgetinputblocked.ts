import { useGadgetClient, useTape } from 'zss/gadget/data/zustandstores'
import { useScreenUILayoutContext } from 'zss/screens/screenui/layoutstate'

/**
 * True when the editor or gadget scroll overlay is open and should steal
 * board / sidebar pointer and framed gadget input.
 */
export function usegadgetinputblocked(): boolean {
  const editoropen = useTape((state) => state.editor.open)
  const scrollopen = useGadgetClient(
    (state) => (state.gadget.scroll?.length ?? 0) > 0,
  )
  const hasscroll = useScreenUILayoutContext()?.hasscroll ?? false
  return editoropen || scrollopen || hasscroll
}
