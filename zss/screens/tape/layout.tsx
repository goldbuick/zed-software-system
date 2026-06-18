import { TERMINAL_MODE, useTape, useTerminal } from 'zss/gadget/data/state'
import { EditorComponent } from 'zss/screens/editor/component'
import { TerminalComponent } from 'zss/screens/terminal/component'

import { TapeLayoutTiles } from './layouttiles'
import { measureminwidth } from './measure'

type TapeLayoutProps = {
  terminalmode: TERMINAL_MODE
  top: number
  width: number
  height: number
}

export function TapeLayout({
  terminalmode,
  top,
  width,
  height,
}: TapeLayoutProps) {
  const pan = useTerminal((state) => state.pan)
  const editoropen = useTape((state) => state.editor.open)
  if (editoropen) {
    return (
      <TapeLayoutTiles
        label="editor"
        terminalmode={terminalmode}
        top={top}
        left={0}
        width={width}
        height={height}
      >
        <EditorComponent />
      </TapeLayoutTiles>
    )
  }
  const terminalwidth = measureminwidth(width)
  return (
    <TapeLayoutTiles
      label="terminal"
      terminalmode={terminalmode}
      top={top}
      left={-pan}
      width={terminalwidth}
      height={height}
    >
      <TerminalComponent />
    </TapeLayoutTiles>
  )
}
