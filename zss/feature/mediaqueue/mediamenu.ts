import { SOFTWARE } from 'zss/device/session'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  mediaqueuehasactivestream,
  mediaqueuehelperconnected,
  mediaqueueislistening,
  mediaqueuereadboundboardid,
  mediaqueuereadboundboardlabel,
  mediaqueuereadpeerid,
} from 'zss/feature/mediaqueue/listenstate'
import { mediaqueuereadstate } from 'zss/feature/mediaqueue/queue'
import {
  zssheaderlines,
  zsstextline,
  zsstexttablelines,
  zsstexttape,
} from 'zss/feature/zsstextui'

function boardlabel(boardid: string): string {
  if (!boardid) {
    return '?'
  }
  return mediaqueuereadboundboardlabel(boardid)
}

function shortplayerid(player: string): string {
  if (player.length <= 10) {
    return player
  }
  return `${player.slice(0, 7)}...`
}

function statushint(canmanage: boolean): string {
  const helperup = mediaqueuehelperconnected()
  const streamup = mediaqueuehasactivestream()
  const state = mediaqueuereadstate()

  if (!mediaqueueislistening()) {
    if (mediaqueuehasactivestream() && !canmanage) {
      return 'receiving board TV -- admin controls queue'
    }
    if (canmanage) {
      return '#media <peerid> to bind Media Queue helper'
    }
    return 'waiting for admin to bind media helper'
  }
  if (!helperup) {
    return 'waiting for Media Queue app'
  }
  if (!streamup && state.urls.length === 0) {
    return 'helper up -- #media add <url> (autoplay)'
  }
  if (!streamup) {
    return 'helper up -- queue will autoplay'
  }
  return 'playing on board TV (autoplay queue)'
}

function statustag(): string {
  const peerid = mediaqueuereadpeerid()
  const boundid = mediaqueuereadboundboardid()
  const helperup = mediaqueuehelperconnected()
  const streamup = mediaqueuehasactivestream()
  const state = mediaqueuereadstate()
  if (!peerid && !boundid) {
    return 'not bound'
  }
  const parts: string[] = []
  if (boundid) {
    parts.push(boardlabel(boundid))
  }
  if (peerid) {
    parts.push(`helper ${peerid}`)
  }
  if (helperup) {
    parts.push('up')
  }
  if (streamup) {
    parts.push('playing')
  }
  parts.push(`limit ${state.perplayerlimit}/player`)
  return parts.join(' / ')
}

/** Terminal #media menu (status + queue table + command hints). */
export function showmediamenu(player: string, canmanage: boolean) {
  const state = mediaqueuereadstate()
  const bound = mediaqueueislistening()
  const rows: string[] = [
    ...zssheaderlines('MEDIA'),
    zsstextline(statustag()),
    zsstextline(statushint(canmanage)),
    '$32',
    '$WHITEcommands',
    '!runit #media ;$grayShow this menu',
  ]

  if (bound) {
    rows.push('!runit #media add ;$greenAdd URL to queue')
  }

  if (canmanage) {
    rows.push('!runit #media skip ;$cyanSkip to next item')
    rows.push('!runit #media clear ;$redClear queue')
    rows.push('!runit #media stop ;$redStop helper connection')
    rows.push('!runit #media limit ;$yellowSet per-player queue limit')
    if (!bound) {
      rows.push(zsstextline('#media <peerid> binds helper on this board'))
    }
  }

  rows.push('$32')

  const queuerows: string[][] = []
  if (state.urls.length === 0) {
    rows.push(zsstextline('queue: (empty)'))
  } else {
    for (let i = 0; i < state.urls.length; ++i) {
      const url = state.urls[i]
      const who = state.players[i] ? shortplayerid(state.players[i]) : '?'
      const mark = i === state.index ? '>' : ' '
      const short = url.length > 44 ? `${url.slice(0, 41)}...` : url
      queuerows.push([mark, String(i), who, short])
    }
    rows.push('$white  queue')
    rows.push(zsstexttablelines(queuerows, ['', 'index', 'who', 'url']))
  }

  terminalwritelines(SOFTWARE, player, zsstexttape(...rows))
}
