export type WanixZedCafeGuestFile = {
  path: string
  data: number[]
}

export type WanixZedCafeHostState = {
  cmd: string
  generation: number
  ready: boolean
  taskrid: string | null
  guestfiles?: WanixZedCafeGuestFile[]
  inboxbytes?: number[]
}

export type WanixZedCafeRoomSpec = {
  cmd: string
  generation: number
  inboxbytes?: number[]
  guestfiles?: WanixZedCafeGuestFile[]
}
