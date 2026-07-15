export type WanixZedCafeGuestFile = {
  path: string
  data: Uint8Array
}

export type WanixZedCafeHostState = {
  cmd: string
  generation: number
  ready: boolean
  taskrid: string | null
}

export type WanixZedCafeRoomSpec = {
  cmd: string
  generation: number
}
