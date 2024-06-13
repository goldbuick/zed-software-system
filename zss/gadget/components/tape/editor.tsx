import { EditorFrame } from './editorframe'
import { Textinput } from './textinput'
import { Textrows } from './textrows'

export function TapeConsoleEditor() {
  return (
    <>
      <EditorFrame />
      <Textrows />
      <Textinput />
    </>
  )
}
