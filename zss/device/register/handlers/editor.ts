import type { DEVICE } from 'zss/device'
import { vmtapeeditorclose } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { synctapeactivelayout } from 'zss/feature/tapelayout'
import { useEditor, useTape } from 'zss/gadget/data/zustandstores'
import { isarray } from 'zss/mapping/types'

export function handleeditoropen(_device: DEVICE, message: MESSAGE): void {
  if (isarray(message.data)) {
    const [book, path, type, title, startline] = message.data
    useEditor.setState({ startline })
    useTape.setState(() => ({
      editor: {
        open: true,
        closing: false,
        player: message.player,
        book,
        path,
        type,
        title,
      },
    }))
    synctapeactivelayout()
  }
}

/** Begin editor exit slide; `finisheditorclose` runs after PanelSlide completes. */
export function handleeditorclose(_device: DEVICE, message: MESSAGE): void {
  void message
  useTape.setState((state) => {
    if (!state.editor.open || state.editor.closing) {
      return state
    }
    return {
      editor: {
        ...state.editor,
        closing: true,
      },
    }
  })
}

/** Clear editor state after the exit slide finishes. */
export function finisheditorclose(device: DEVICE, player: string): void {
  useTape.setState((state) => ({
    editor: {
      ...state.editor,
      open: false,
      closing: false,
    },
  }))
  synctapeactivelayout()
  vmtapeeditorclose(device, player)
}
