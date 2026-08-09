import type { DEVICE } from 'zss/device'
import { vmairshare, vmflush } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { airshareinviteurl } from 'zss/feature/airshare/bytes'
import { airshareclearfocus } from 'zss/feature/airshare/focus'
import { airsharereset, useAirshare } from 'zss/feature/airshare/state'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { isstring } from 'zss/mapping/types'
import { memoryreadoperator } from 'zss/memory/session'

export function handleairsharesend(device: DEVICE, message: MESSAGE): void {
  const inviteurl = airshareinviteurl()
  airsharereset()
  airshareclearfocus(device, message.player)
  useAirshare.setState({
    mode: 'invite',
    inviteurl,
    status: 'scan invite QR, then tap ok to transmit',
    error: '',
  })
  terminalwritelines(
    device,
    message.player,
    'airshare invite ready -- scan QR, then ok to transmit',
  )
}

export function handleairsharereceive(device: DEVICE, message: MESSAGE): void {
  airsharereset()
  airshareclearfocus(device, message.player)
  useAirshare.setState({
    mode: 'receive',
    status: 'point camera at sender stream QR',
    error: '',
  })
  terminalwritelines(
    device,
    message.player,
    'airshare receive -- point camera at the streaming QR',
  )
}

export function handleairsharestop(device: DEVICE, message: MESSAGE): void {
  airsharereset()
  terminalwritelines(device, message.player, 'airshare stopped')
}

export function handleairsharestream(device: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  const player = message.player || operator
  terminalwritelines(device, player, 'airshare compressing MEMORY...')
  useAirshare.setState({
    status: 'compressing MEMORY...',
    error: '',
  })
  vmflush(device, operator)
  vmairshare(device, player)
}

export function handleairsharepayload(device: DEVICE, message: MESSAGE): void {
  if (!isstring(message.data) || !message.data) {
    terminalwritelines(device, message.player, 'airshare error: empty MEMORY')
    useAirshare.setState({
      error: 'empty MEMORY',
      status: '',
    })
    return
  }
  doasync(device, message.player, async () => {
    const { airsharebase64urltobytes } =
      await import('zss/feature/airshare/bytes')
    const payload = airsharebase64urltobytes(message.data as string)
    airshareclearfocus(device, message.player)
    useAirshare.setState({
      mode: 'stream',
      payload,
      progress: 0,
      status: 'streaming MEMORY as QR...',
      error: '',
    })
    terminalwritelines(
      device,
      message.player,
      `airshare streaming ${payload.length} bytes`,
    )
  })
}
