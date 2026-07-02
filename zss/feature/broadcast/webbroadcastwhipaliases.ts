import { DEFAULT_IVS_WHIP_ENDPOINT } from 'zss/feature/broadcast/webbroadcastconstants'
import { NAME } from 'zss/words/types'

export const TWITCH_WHIP_ENDPOINT =
  'https://g.webrtc.live-video.net:4443/v2/offer'

const WHIP_ENDPOINT_ALIASES: Record<string, string> = {
  twitch: TWITCH_WHIP_ENDPOINT,
  ivs: DEFAULT_IVS_WHIP_ENDPOINT,
  'ivs-realtime': DEFAULT_IVS_WHIP_ENDPOINT,
  ivsrealtime: DEFAULT_IVS_WHIP_ENDPOINT,
}

export function listwhipendpointaliases(): string[] {
  return ['twitch', 'ivs']
}

export function resolvewhipendpoint(
  endpointoralias: string,
): string | undefined {
  const raw = endpointoralias.trim()
  if (/^https?:\/\//i.test(raw)) {
    return raw
  }
  const key = NAME(raw)
  return WHIP_ENDPOINT_ALIASES[key]
}
