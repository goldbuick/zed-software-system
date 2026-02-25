import { useCallback } from 'react'
import { useTerminal } from 'zss/gadget/data/state'
import { clamp } from 'zss/mapping/number'
import { stringsplice } from 'zss/mapping/string'

export function useTerminalSplice(
  inputstate: string,
  buffer: string[],
  bufferindex: number,
) {
  const inputstatesetsplice = useCallback(
    (index: number, count: number, insert?: string) => {
      if (bufferindex > 0) {
        useTerminal.setState({ bufferindex: 0 })
      }
      buffer[0] = stringsplice(inputstate, index, count, insert)
      useTerminal.setState({
        buffer,
        xselect: undefined,
        xcursor: index + (insert ?? '').length,
        autocompleteactive: true,
      })
    },
    [inputstate, buffer, bufferindex],
  )

  const inputstatereplace = useCallback(
    (replacewith: string) => {
      if (bufferindex > 0) {
        useTerminal.setState({ bufferindex: 0 })
      }
      buffer[0] = replacewith
      useTerminal.setState({
        buffer,
        xselect: undefined,
        xcursor: replacewith.length,
        autocompleteactive: true,
      })
    },
    [buffer, bufferindex],
  )

  return { inputstatesetsplice, inputstatereplace }
}

export function useTerminalYCursor(
  logrowtotalheight: number,
  visiblerows: number,
) {
  return useCallback(
    (moveby: number) => {
      useTerminal.setState((state) => {
        const ycursor = clamp(
          Math.round(state.ycursor + moveby),
          0,
          logrowtotalheight,
        )
        const scroll = clamp(
          ycursor - Math.round(visiblerows * 0.5),
          0,
          logrowtotalheight - visiblerows,
        )
        return { ycursor, scroll }
      })
    },
    [logrowtotalheight, visiblerows],
  )
}

export function useTerminalResetToEnd(inputstateLength: number) {
  return useCallback(() => {
    useTerminal.setState({
      scroll: 0,
      xcursor: inputstateLength,
      ycursor: 0,
      xselect: undefined,
      yselect: undefined,
    })
  }, [inputstateLength])
}
