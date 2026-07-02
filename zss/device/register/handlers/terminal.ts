import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { terminalinclayout } from 'zss/device/register/helpers/layout'
import {
  TAPE_DISPLAY,
  useTape,
  useTerminal,
} from 'zss/gadget/data/zustandstores'
import { isboolean, isstring } from 'zss/mapping/types'

export function handleterminalfull(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  useTape.setState((state) => ({
    layout: TAPE_DISPLAY.FULL,
    terminal: {
      ...state.terminal,
      open: true,
    },
  }))
}

export function handleterminalopen(_device: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    const buffer = useTerminal.getState().buffer
    buffer[0] = message.data
    useTerminal.setState({
      buffer,
      bufferindex: 0,
      xcursor: message.data.length,
      ycursor: 0,
      xselect: undefined,
      yselect: undefined,
    })
  }
  useTape.setState((state) => ({
    terminal: {
      ...state.terminal,
      open: true,
    },
  }))
}

export function handleterminalquickopen(
  _device: DEVICE,
  message: MESSAGE,
): void {
  if (isstring(message.data)) {
    const buffer = useTerminal.getState().buffer
    buffer[0] = message.data
    useTerminal.setState({
      buffer,
      bufferindex: 0,
      xcursor: message.data.length,
      ycursor: 0,
      xselect: undefined,
      yselect: undefined,
    })
  }
  useTape.setState({ terminalmode: 'quick', layout: TAPE_DISPLAY.TOP })
}

export function handleterminalclose(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  useTape.setState((state) => ({
    terminalmode: 'cli',
    terminal: {
      ...state.terminal,
      open: false,
    },
  }))
}

export function handleterminaltoggle(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  useTape.setState((state) => ({
    terminal: {
      ...state.terminal,
      open: !state.terminal.open,
    },
  }))
}

export function handleterminalinclayout(
  _device: DEVICE,
  message: MESSAGE,
): void {
  if (isboolean(message.data)) {
    terminalinclayout(message.data)
  }
}
