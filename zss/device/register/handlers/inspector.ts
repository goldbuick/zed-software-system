import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { storagewriteconfig } from 'zss/feature/storage'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { useInspector, useTape } from 'zss/gadget/data/zustandstores'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent } from 'zss/mapping/types'
import { memorywriteconfig } from 'zss/memory/utilities'

export function handleinspector(device: DEVICE, message: MESSAGE): void {
  const previnspector = useTape.getState().inspector
  const enabled = ispresent(message.data) ? !!message.data : !previnspector
  const line1 = `gadget inspector ${enabled ? '$greenon' : '$redoff'}`
  terminalwritelines(
    device,
    message.player,
    enabled ? `${line1}\nmouse click or tap elements to inspect` : line1,
  )
  useTape.setState({ inspector: enabled })
  if (!ispresent(message.data)) {
    const gadgetval = enabled ? 'on' : 'off'
    doasync(device, message.player, async () => {
      await storagewriteconfig('gadget', gadgetval)
      memorywriteconfig('gadget', gadgetval)
    })
  }
}

export function handleperfmonitor(device: DEVICE, message: MESSAGE): void {
  const prevperf = useTape.getState().perfmonitor
  const enabled = ispresent(message.data) ? !!message.data : !prevperf
  const line1 = `perf monitor ${enabled ? '$greenon' : '$redoff'}`
  terminalwritelines(device, message.player, line1)
  useTape.setState({ perfmonitor: enabled })
}

export function handlefindany(_device: DEVICE, message: MESSAGE): void {
  if (isarray(message.data)) {
    useInspector.setState({ pts: message.data })
  }
}
