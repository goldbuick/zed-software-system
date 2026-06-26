import { SOFTWARE } from 'zss/device/session'
import { readbroadcastactive } from 'zss/feature/broadcast/broadcastactive'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  zssheaderlines,
  zsssectionlines,
  zsstextline,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'

export function showbroadcastmenu(player: string) {
  const rows: string[] = [
    ...zssheaderlines('BROADCAST'),
    zsstextline('canvas video + synth audio from this session'),
    ...zsssectionlines('Twitch'),
    '!runit #broadcast ;$purpleTwitch $greenlow-latency — stream key',
    '!runit #broadcast whip twitch ;$purpleTwitch $greenWHIP v2 — stream key',
    ...zsssectionlines('Amazon IVS'),
    '!runit #broadcast ;$purpleIVS $greenlow-latency — stream key',
    '!runit #broadcast whip ivs ;$purpleIVS $greenReal-Time — participant token',
    ...zsssectionlines('WHIP / LiveKit Ingress'),
    '!runit #broadcast whip ;$greenCustom WHIP — paste URL then bearer',
    zsstextline('$GRAYLiveKit: use WHIP URL from CreateIngress + bearer'),
  ]
  if (readbroadcastactive()) {
    rows.push(...zsssectionlines('Control'))
    rows.push(zsszedlinkline('broadcast stop', '$redStop broadcast'))
  }
  rows.push(zsszedlinkline('bridge status', '$grayCheck status'))
  terminalwritelines(SOFTWARE, player, zsstexttape(...rows))
}
