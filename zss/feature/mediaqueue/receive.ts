import type { DataConnection } from 'peerjs'
import { apierror, apilog, vmmediaqueueboard, workstatus } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/bootstrap'
import {
  mediaqueueconnectifonboard,
  mediaqueuedisconnect,
  mediaqueueretryplayerconnect,
} from 'zss/feature/mediaqueue/playerconnect'
import {
  mediaqueueclearlistenstate,
  mediaqueuehelperconnected,
  mediaqueueislistening,
  mediaqueuereadboundboardid,
  mediaqueuereadhelperpeerid,
  mediaqueuereadlistenplayer,
  mediaqueuesethelperconnected,
  mediaqueuesethelperpeerid,
  mediaqueuesetlistenboardid,
  mediaqueuesetlistening,
  mediaqueuesetlistenplayer,
} from 'zss/feature/mediaqueue/listenstate'
import {
  type MEDIAQUEUE_MESSAGE,
  MEDIAQUEUE_PROTOCOL,
  ismediaqueuemessage,
} from 'zss/feature/mediaqueue/protocol'
import {
  mediaqueuecurrenturl,
  mediaqueuereadstate,
  mediaqueueshiftcurrent,
} from 'zss/feature/mediaqueue/queue'
import {
  mediaqueueformatnowplayinglabel,
  mediaqueuesyncnowplayingboard,
} from 'zss/feature/mediaqueue/nowplayinglabel'
import { mediaqueuestatusworklabel } from 'zss/feature/mediaqueue/workstatuslabel'
import {
  netterminaldataconnect,
  readnetworkpeerid,
} from 'zss/feature/netterminal'
import { MAYBE, ispresent } from 'zss/mapping/types'

let helperconnection: MAYBE<DataConnection>

function sendtohelper(message: MEDIAQUEUE_MESSAGE) {
  if (!ispresent(helperconnection) || !helperconnection.open) {
    return
  }
  void helperconnection.send(message)
}

function helperdatalinkup(): boolean {
  return (
    mediaqueuehelperconnected() &&
    ispresent(helperconnection) &&
    helperconnection.open
  )
}

function mediaqueueadvanceafterplayback() {
  mediaqueueshiftcurrent()
  mediaqueuepushqueuesnapshot(true)
  const listenplayer = mediaqueuereadlistenplayer()
  if (!listenplayer) {
    return
  }
  if (mediaqueuecurrenturl()) {
    apilog(SOFTWARE, listenplayer, 'mediaqueue helper: advancing queue')
  } else {
    apilog(SOFTWARE, listenplayer, 'mediaqueue helper: queue empty')
    mediaqueueclearnowplayingboard()
  }
}

export function mediaqueuepushqueuesnapshot(gotoplay = false) {
  const state = mediaqueuereadstate()
  sendtohelper({
    type: 'mediaqueue:queue',
    urls: state.urls,
    index: state.index,
  })
  const url = mediaqueuecurrenturl()
  if (gotoplay && url) {
    sendtohelper({
      type: 'mediaqueue:goto',
      index: state.index,
      url,
    })
  }
}

function mediaqueuerequesthelpercall() {
  sendtohelper({ type: 'mediaqueue:requestcall' })
}

function mediaqueuestatusdetail(detail?: string): string {
  if (!detail) {
    return ''
  }
  const trimmed = detail.trim()
  if (!trimmed) {
    return ''
  }
  if (trimmed.includes('://')) {
    return ` ${trimmed}`
  }
  const slash = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  if (slash >= 0) {
    return ` ${trimmed.slice(slash + 1)}`
  }
  return ` ${trimmed}`
}

function mediaqueueworkstatus(label: string) {
  const player = mediaqueuereadlistenplayer()
  if (!player) {
    return
  }
  workstatus(SOFTWARE, player, label)
}

function syncboardhelperlayer(
  player: string,
  boardid: string,
  helperpeerid: string | undefined,
) {
  vmmediaqueueboard(SOFTWARE, player, boardid, helperpeerid)
}

function mediaqueuesyncnowplayingfromstatus(detail?: string) {
  const player = mediaqueuereadlistenplayer()
  const boardid = mediaqueuereadboundboardid()
  if (!player || !boardid) {
    return
  }
  const label = mediaqueueformatnowplayinglabel(
    detail,
    mediaqueuecurrenturl(),
  )
  if (!label) {
    return
  }
  mediaqueuesyncnowplayingboard(player, boardid, label)
}

function mediaqueueclearnowplayingboard() {
  const player = mediaqueuereadlistenplayer()
  const boardid = mediaqueuereadboundboardid()
  if (!player || !boardid) {
    return
  }
  mediaqueuesyncnowplayingboard(player, boardid, undefined)
}

function mediaqueueapplynowplayingstatus(status: string, detail?: string) {
  if (status === 'buffering' || status === 'playing') {
    mediaqueuesyncnowplayingfromstatus(detail)
    return
  }
  if (
    status === 'playback-ended' ||
    status === 'download-failed' ||
    status === 'playback-failed' ||
    status === 'call-stopped'
  ) {
    mediaqueueclearnowplayingboard()
  }
}

function handlehelperdata(data: unknown) {
  if (!ismediaqueuemessage(data)) {
    return
  }
  switch (data.type) {
    case 'mediaqueue:hello':
      if (data.role === 'helper' && mediaqueuereadlistenplayer()) {
        apilog(
          SOFTWARE,
          mediaqueuereadlistenplayer(),
          `mediaqueue helper connected (${data.peerid})`,
        )
        mediaqueuepushqueuesnapshot(true)
        mediaqueuerequesthelpercall()
      }
      break
    case 'mediaqueue:status':
      if (mediaqueuereadlistenplayer()) {
        const detail = mediaqueuestatusdetail(data.detail)
        const player = mediaqueuereadlistenplayer()
        mediaqueueapplynowplayingstatus(data.status, data.detail)
        const worklabel = mediaqueuestatusworklabel(data.status, data.detail)
        if (worklabel || data.status === 'playing') {
          mediaqueueworkstatus(worklabel)
        }
        if (data.status === 'waiting-for-url') {
          apilog(SOFTWARE, player, 'mediaqueue helper: waiting for queue URL')
        } else if (data.status === 'downloading') {
          apilog(SOFTWARE, player, `mediaqueue helper: downloading${detail}`)
        } else if (data.status === 'extracting') {
          apilog(SOFTWARE, player, `mediaqueue helper: extracting${detail}`)
        } else if (data.status === 'download-progress') {
          const parts = (data.detail ?? '').split('|')
          const pct = Number(parts[0])
          if (
            Number.isFinite(pct) &&
            (pct === 0 || pct >= 99 || pct % 5 === 0)
          ) {
            const eta = parts[1] ? ` eta ${parts[1]}` : ''
            apilog(
              SOFTWARE,
              player,
              `mediaqueue helper: download ${Math.round(pct)}%${eta}`,
            )
          }
        } else if (data.status === 'transcoding') {
          apilog(SOFTWARE, player, 'mediaqueue helper: processing')
        } else if (data.status === 'buffering') {
          apilog(SOFTWARE, player, `mediaqueue helper: buffering${detail}`)
        } else if (data.status === 'playback-ended') {
          apilog(SOFTWARE, player, 'mediaqueue helper: finished, advancing')
          if (mediaqueueislistening() && helperdatalinkup()) {
            mediaqueueadvanceafterplayback()
          }
        } else if (data.status === 'download-failed') {
          apierror(SOFTWARE, player, 'media', `helper download failed${detail}`)
          if (mediaqueueislistening() && helperdatalinkup()) {
            mediaqueueadvanceafterplayback()
          }
        } else if (data.status === 'playback-failed') {
          apierror(SOFTWARE, player, 'media', `helper playback failed${detail}`)
          if (mediaqueueislistening() && helperdatalinkup()) {
            mediaqueueadvanceafterplayback()
          }
        } else if (data.status === 'call-stopped') {
          apilog(
            SOFTWARE,
            player,
            'mediaqueue helper: call stopped (queue kept)',
          )
        } else if (data.status === 'playing') {
          mediaqueueretryplayerconnect()
          apilog(SOFTWARE, player, `mediaqueue helper: playing${detail}`)
        } else {
          apilog(SOFTWARE, player, `mediaqueue helper: ${data.status}${detail}`)
        }
      }
      break
    default:
      break
  }
}

function wirehelperconnection(conn: DataConnection) {
  if (ispresent(helperconnection) && helperconnection !== conn) {
    helperconnection.close()
  }
  helperconnection = conn
  mediaqueuesethelperconnected(conn.open)
  conn.on('data', handlehelperdata)
  conn.on('open', () => {
    mediaqueuesethelperconnected(true)
    sendtohelper({
      type: 'mediaqueue:hello',
      protocol: MEDIAQUEUE_PROTOCOL,
      role: 'cafe',
      peerid: readnetworkpeerid() ?? '',
    })
    mediaqueuepushqueuesnapshot(true)
    mediaqueuerequesthelpercall()
  })
  conn.on('close', () => {
    if (helperconnection === conn) {
      helperconnection = undefined
      mediaqueuesethelperconnected(false)
    }
  })
  conn.on('error', () => {
    if (helperconnection === conn) {
      helperconnection = undefined
      mediaqueuesethelperconnected(false)
    }
  })
}

/** Wire board TV sink; players connect to helper via MEDIA layer. */
export { mediaqueuebootstrap } from 'zss/feature/mediaqueue/bootstrap'

/**
 * Connect to the desktop helper's Peer id and bind media to the player's
 * current board (helper peer id projected on board for direct player connects).
 */
export function mediaqueuelisten(
  player: string,
  peerid: string,
  boardid: string,
  boardname?: string,
): void {
  mediaqueuebootstrap()
  const trimmed = peerid.trim()
  if (!trimmed) {
    apierror(
      SOFTWARE,
      player,
      'media',
      'enter the helper peer id from the Media Queue app first',
    )
    return
  }

  const boundboardid = boardid.trim()
  if (!boundboardid) {
    apierror(
      SOFTWARE,
      player,
      'media',
      'need an active player on a board to bind media',
    )
    return
  }

  mediaqueuesetlistenplayer(player)

  if (mediaqueueislistening()) {
    if (
      mediaqueuereadhelperpeerid() === trimmed &&
      mediaqueuereadboundboardid() === boundboardid
    ) {
      if (helperdatalinkup()) {
        apilog(
          SOFTWARE,
          player,
          `media already listening to helper ${trimmed} on board ${boardname ?? boundboardid}`,
        )
        mediaqueueretryplayerconnect()
        return
      }
      apilog(
        SOFTWARE,
        player,
        `media reconnecting to helper ${trimmed} on board ${boardname ?? boundboardid}`,
      )
      syncboardhelperlayer(player, boundboardid, trimmed)
      const conn = netterminaldataconnect(trimmed)
      if (ispresent(conn)) {
        wirehelperconnection(conn)
        mediaqueueconnectifonboard(trimmed, boundboardid)
      } else {
        apierror(
          SOFTWARE,
          player,
          'media',
          'could not reopen helper data connection',
        )
      }
      return
    }
    apierror(
      SOFTWARE,
      player,
      'media',
      `already listening to helper ${mediaqueuereadhelperpeerid() || '?'} on board ${mediaqueuereadboundboardid() || '?'} -- use #queue stop first`,
    )
    return
  }

  mediaqueuesethelperpeerid(trimmed)
  mediaqueuesetlistenboardid(boundboardid)
  mediaqueuesetlistening(true)
  syncboardhelperlayer(player, boundboardid, trimmed)
  apilog(
    SOFTWARE,
    player,
    `media bound to helper ${mediaqueuereadhelperpeerid()} on board ${boardname ?? boundboardid}`,
  )
  apilog(
    SOFTWARE,
    player,
    'waiting for Media Queue app to accept the connection',
  )
  const conn = netterminaldataconnect(mediaqueuereadhelperpeerid())
  if (ispresent(conn)) {
    wirehelperconnection(conn)
    mediaqueueconnectifonboard(trimmed, boundboardid)
  } else {
    apierror(SOFTWARE, player, 'media', 'could not open helper data connection')
    syncboardhelperlayer(player, boundboardid, undefined)
    mediaqueueclearlistenstate()
  }
}

export function mediaqueuestop(player: string): void {
  const boundboardid = mediaqueuereadboundboardid()
  mediaqueuesetlistenplayer(player)
  if (ispresent(helperconnection)) {
    helperconnection.close()
    helperconnection = undefined
    mediaqueuesethelperconnected(false)
  }
  if (boundboardid) {
    syncboardhelperlayer(player, boundboardid, undefined)
  }
  mediaqueuedisconnect()
  mediaqueueclearlistenstate()
  apilog(SOFTWARE, player, 'media stopped')
}
