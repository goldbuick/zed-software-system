import { mediaqueuenotifyboardtvgate } from 'zss/feature/mediaqueue/listenstate'

let layerhelperpeerid = ''
let layerboard = ''
let pendingconnect = false

export function mediaqueuesetplayerlayerstate(
  helperpeerid: string,
  board: string,
  pending = false,
) {
  layerhelperpeerid = helperpeerid
  layerboard = board
  pendingconnect = pending
  mediaqueuenotifyboardtvgate()
}

export function mediaqueueclearplayerlayerstate() {
  layerhelperpeerid = ''
  layerboard = ''
  pendingconnect = false
  mediaqueuenotifyboardtvgate()
}

export function mediaqueuesetplayerlayerpending(pending: boolean) {
  pendingconnect = pending
  mediaqueuenotifyboardtvgate()
}

export function mediaqueuereadplayerlayerstate() {
  return {
    helperpeerid: layerhelperpeerid,
    board: layerboard,
    pendingconnect,
  }
}

export type MEDIAQUEUE_LAYER_CONNECT_ACTION =
  | { kind: 'connect'; helperpeerid: string }
  | { kind: 'disconnect' }
  | { kind: 'noop' }

export type MEDIAQUEUE_LAYER_CONNECT_INPUT = {
  gadgetboard: string
  activehelper: string
  islistening: boolean
  boundboard: string
  boundhelper: string
  layerhelper: string
  layerboard: string
}

/** MediaLayers connect/disconnect policy (join-safe during layer paint races). */
export function mediaqueuelayerconnectaction(
  input: MEDIAQUEUE_LAYER_CONNECT_INPUT,
): MEDIAQUEUE_LAYER_CONNECT_ACTION {
  const board = input.gadgetboard.trim()
  if (!board) {
    return { kind: 'noop' }
  }
  const activehelper = input.activehelper.trim()
  if (activehelper) {
    return { kind: 'connect', helperpeerid: activehelper }
  }
  const boundhelper = input.boundhelper.trim()
  const boundboard = input.boundboard.trim()
  if (input.islistening && boundhelper && boundboard === board) {
    return { kind: 'connect', helperpeerid: boundhelper }
  }
  const layerhelper = input.layerhelper.trim()
  const layerboard = input.layerboard.trim()
  if (layerhelper && layerboard === board) {
    return { kind: 'disconnect' }
  }
  return { kind: 'noop' }
}
