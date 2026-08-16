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
