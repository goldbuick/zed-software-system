import { Html } from '@react-three/drei'
import useInterval from '@use-it/interval/dist/index'
import { MAYBE_TEXT } from '@zss/yjs/types'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import React, { useEffect, useRef, useState } from 'react'

import {
  GLTextEditState,
  GUI_ELEMENT,
  getTextFromGLTextEdit,
} from '../../../data/gui'
import { TILE_SIZE } from '../../../img/types'
import { useMonacoBinding } from '../../monaco/binding'
import { ElementProps } from '../../types'
import { Clickable } from '../clickable'
import { MoveCursorRender } from '../context'
import { theme, Draw, drawStringPadEnd } from '../draw'
import { ElementState } from '../elementstate'

interface TextEditContentProps {
  width: number
  height: number
  onEditor: (editor: monaco.editor.IStandaloneCodeEditor) => void
  onCursor: () => void
  onFocus: () => void
  onBlur: () => void
}

function TextEditContent({
  width,
  height,
  onEditor,
  onCursor,
  onFocus,
  onBlur,
}: TextEditContentProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) {
      return
    }

    const editor = monaco.editor.create(ref.current, {
      value: '',
      fontSize: 20,
      theme: 'texttheme',
      language: 'plaintext',
      fontFamily: 'IBM_VGA',
      automaticLayout: true,
      trimAutoWhitespace: true,
      fixedOverflowWidgets: true,
      overflowWidgetsDomNode:
        document.getElementById('overflow-widgets') ?? undefined,
      minimap: {
        enabled: false,
      },
      folding: false,
      glyphMargin: false,
      lineNumbers: 'off',
      lineNumbersMinChars: 0,
      lineDecorationsWidth: 0,
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
      },
    })

    const dispose: monaco.IDisposable[] = []

    dispose.push(
      editor.onDidChangeModelContent(() => {
        let updatedText = editor.getValue() || ''

        // textedit is single line only
        updatedText = updatedText.replaceAll(/[\n\r]/g, '')

        const limit = width - 1
        if (limit > 0 && updatedText.length > limit) {
          updatedText = updatedText.substring(0, limit)
        }

        if (updatedText !== editor.getValue()) {
          const selections = editor.getSelections()
          editor.setValue(updatedText)
          if (selections) {
            editor.setSelections(selections)
          }
        }
      }),
      editor.onDidChangeCursorPosition(onCursor),
      editor.onDidChangeCursorSelection(onCursor),
      editor.onDidFocusEditorText(onFocus),
      editor.onDidBlurEditorText(onBlur),
    )

    // signal success
    onEditor(editor)

    // cleanup
    return () => {
      editor.dispose()
      dispose.forEach((item) => item.dispose())
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={ref}
      style={{
        top: -100000,
        // top: 200,
        position: 'absolute',
        width: width * TILE_SIZE,
        height: (height + 3) * TILE_SIZE,
        background: '#000',
      }}
    ></div>
  )
}

interface TextEditDisplayProps {
  even: boolean
  text: MAYBE_TEXT
  width: number
  state: GLTextEditState
}

export function TextEditDisplay({
  even,
  text,
  width,
  state,
}: TextEditDisplayProps) {
  const height = 1
  const [cycle, setCycle] = useState(0)
  const [focused, setFocused] = useState(false)
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null)

  useMonacoBinding(text, editor)

  useInterval(() => {
    setCycle((state) => {
      return state === 2 ? 1 : 1 - state
    })
  }, 500)

  const chars = drawStringPadEnd(state.value, width)
  const colors = Array(width).fill(
    even ? theme.edit.even.text : theme.edit.odd.text,
  )
  const bgs = Array(width).fill(
    even ? theme.edit.even.color : theme.edit.odd.color,
  )

  if (focused && cycle) {
    editor?.getSelections()?.forEach((selection) => {
      let left = Math.min(selection.startColumn - 1, selection.endColumn - 1)
      let right = Math.max(selection.startColumn - 1, selection.endColumn - 1)

      // selection mode vs cursor mode
      if (selection.startColumn !== selection.endColumn) {
        right -= 1
      }

      // skip out of bounds
      if (left >= colors.length || right < 0) {
        return
      }

      // clip to bounds
      left = Math.max(left, 0)
      right = Math.min(right, colors.length - 1)

      // flip colors
      for (let i = left; i <= right; ++i) {
        const t = colors[i]
        colors[i] = bgs[i]
        bgs[i] = t
      }
    })
  }

  // TODO:
  // Draw util component should expose a ref
  // and said ref can write chars, colors, bgs
  // so we avoid a react re-render ??

  return (
    <React.Fragment>
      <Draw
        key={width}
        width={width}
        height={height}
        chars={chars}
        colors={colors}
        bgs={bgs}
      />
      <Clickable
        width={width}
        height={height}
        cursor="text"
        onPressed={(pressed) => {
          if (!editor || pressed) {
            return
          }
          setCycle(2)
          setFocused(true)
          editor.focus()
          editor.setPosition({ lineNumber: 1, column: width })
        }}
      />
      <Html position={[0, 0, 0]}>
        <TextEditContent
          width={width}
          height={height}
          onEditor={setEditor}
          onFocus={() => setCycle(2)}
          onCursor={() => setCycle(2)}
          onBlur={() => setFocused(false)}
        />
      </Html>
    </React.Fragment>
  )
}

export function TextEdit({ element }: ElementProps) {
  const text = getTextFromGLTextEdit(element)
  return (
    <ElementState element={element}>
      {(state) => {
        if (state?.type !== GUI_ELEMENT.TEXT_EDIT) {
          return null
        }

        const width = Math.max(1, state.width)
        const height = 1

        return (
          <MoveCursorRender width={width + 1} height={height}>
            {({ even }) => (
              <TextEditDisplay
                even={even}
                text={text}
                width={width}
                state={state}
              />
            )}
          </MoveCursorRender>
        )
      }}
    </ElementState>
  )
}
