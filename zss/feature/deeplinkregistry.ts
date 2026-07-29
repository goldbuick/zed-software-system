import type { DEVICELIKE } from 'zss/device/types'

export type DEEPLINK_SURFACE = 'boot' | 'menu' | 'cli'

export type DEEPLINK_CONTEXT = {
  player: string
  surface: DEEPLINK_SURFACE
  openterminal?: boolean
  device?: DEVICELIKE
}

export type DEEPLINK_HANDLER = {
  id: string
  paramkeys: string[]
  match: () => boolean
  readdata: () => unknown
  fingerprint: (data: unknown) => string
  run: (ctx: DEEPLINK_CONTEXT, data: unknown) => Promise<boolean>
}

const handlers: DEEPLINK_HANDLER[] = []

export function registerdeeplink(handler: DEEPLINK_HANDLER) {
  handlers.push(handler)
}

export function listdeeplinkhandlers(): readonly DEEPLINK_HANDLER[] {
  return handlers
}
