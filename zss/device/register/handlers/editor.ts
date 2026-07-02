import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmtapeeditorclose } from 'zss/device/api'
import { useEditor, useTape } from 'zss/gadget/data/zustandstores'
import { isarray } from 'zss/mapping/types'

export function handleeditoropen(_device: DEVICE, message: MESSAGE): void {
  if (isarray(message.data)) {
    const [book, path, type, title, startline] = message.data
    useEditor.setState({ startline })
    useTape.setState(() => ({
      editor: {
        open: true,
        player: message.player,
        book,
        path,
        type,
        title,
      },
    }))
  }
}

export function handleeditorclose(device: DEVICE, message: MESSAGE): void {
  useTape.setState((state) => ({
    editor: {
      ...state.editor,
      open: false,
    },
  }))
  vmtapeeditorclose(device, message.player)
}
