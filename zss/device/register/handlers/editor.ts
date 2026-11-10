import type { DEVICE } from 'zss/device'
import { vmcodeaddress, vmtapeeditorclose } from 'zss/device/api'
import { modemreadtextsync } from 'zss/device/modem'
import type { MESSAGE } from 'zss/device/types'
import { synctapeactivelayout } from 'zss/feature/tapelayout'
import { useEditor, useTape } from 'zss/gadget/data/zustandstores'
import { useDeviceData } from 'zss/gadget/device'
import {
  getmobiletextelement,
  mobiletextblur,
  mobiletextfocus,
} from 'zss/gadget/mobiletext'
import { MAYBE, isarray, isstring } from 'zss/mapping/types'

function focuseditortext(book: string, path: MAYBE<string>[]) {
  if (!useDeviceData.getState().usemobiletextcapture) {
    return
  }
  const el = getmobiletextelement()
  const code = modemreadtextsync(vmcodeaddress(book, path))
  if (el && el.value !== code) {
    el.value = code
  }
  mobiletextfocus()
}

export function handleeditoropen(_device: DEVICE, message: MESSAGE): void {
  if (isarray(message.data)) {
    const [book, path, type, title, startline] = message.data
    if (isstring(book)) {
      focuseditortext(book, isarray(path) ? path : [])
    }
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
  const open = useTape.getState()
  if (!open.editor.open || open.editor.closing) {
    return
  }
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
  if (useDeviceData.getState().usemobiletextcapture) {
    mobiletextblur()
  }
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
