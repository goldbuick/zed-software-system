export type WanixZedCafeGuestFile = {
  path: string
  data: number[]
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
