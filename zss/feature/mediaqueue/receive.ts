import type { DataConnection } from 'peerjs'
import { apierror, apilog, vmmediaqueueboard } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/bootstrap'
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
  mediaqueueformatnowplayinglabel,
  mediaqueuesyncnowplayingboard,
} from 'zss/feature/mediaqueue/nowplayinglabel'
import {
  mediaqueueconnectifonboard,
  mediaqueuedisconnect,
  mediaqueueretryplayerconnect,
} from 'zss/feature/mediaqueue/playerconnect'
import {
  type MEDIAQUEUE_MESSAGE,
  MEDIAQUEUE_PROTOCOL,
  ismediaqueuemessage,
} from 'zss/feature/mediaqueue/protocol'
import {
  mediaqueueapplysnapshot,
  mediaqueuecurrenturl,
  mediaqueuereadperplayerlimit,
} from 'zss/feature/mediaqueue/queue'
import {
  netterminaldataconnect,
  netterminalregisterpeeropenhandler,
  readnetworkpeerid,
} from 'zss/feature/netterminal'
import { write } from 'zss/feature/writeui'
import { MAYBE, ispresent } from 'zss/mapping/types'

const HELPER_RECONNECT_MS = 1000

let helperconnection: MAYBE<DataConnection>
let helperreconnecttimer: ReturnType<typeof setTimeout> | undefined

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

export function mediaqueuehelperdatalinkup(): boolean {
  return helperdatalinkup()
}

export function mediaqueuesendtohelper(message: MEDIAQUEUE_MESSAGE): boolean {
  if (!helperdatalinkup()) {
    return false
  }
  sendtohelper(message)
  return true
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
  const label = mediaqueueformatnowplayinglabel(detail, mediaqueuecurrenturl())
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
    status === 'call-stopped' ||
    status === 'queue-cleared'
  ) {
    mediaqueueclearnowplayingboard()
  }
}

function toastlistenplayer(ok: boolean, text: string) {
  const player = mediaqueuereadlistenplayer()
  if (!player) {
    return
  }
  if (ok) {
    write(SOFTWARE, player, text)
    return
  }
  apierror(SOFTWARE, player, 'media', text)
}

function handlequeuestatus(status: string, detail?: string) {
  if (status === 'queue-added') {
    toastlistenplayer(true, `media added: ${detail || ''}`.trim())
    return
  }
  if (status === 'queue-skipped') {
    toastlistenplayer(true, 'queue skipped to next')
    return
  }
  if (status === 'queue-cleared') {
    toastlistenplayer(true, 'queue cleared')
    return
  }
  if (status === 'queue-limit') {
    const limit = detail || String(mediaqueuereadperplayerlimit())
    toastlistenplayer(true, `queue limit: ${limit} per player`)
    return
  }
  if (status === 'queue-error') {
    if (detail === 'duplicate') {
      toastlistenplayer(false, 'URL already in queue')
      return
    }
    if (detail === 'limit') {
      toastlistenplayer(
        false,
        `queue limit (${mediaqueuereadperplayerlimit()} per player)`,
      )
      return
    }
    toastlistenplayer(false, 'usage: #media <url>')
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
          `media connected (${data.peerid})`,
        )
        mediaqueuerequesthelpercall()
      }
      break
    case 'mediaqueue:queuesnapshot':
      mediaqueueapplysnapshot({
        urls: data.urls,
        names: data.names,
        index: data.index,
        limit: data.limit,
      })
      if (!mediaqueuecurrenturl()) {
        mediaqueueclearnowplayingboard()
      }
      break
    case 'mediaqueue:status':
      if (mediaqueuereadlistenplayer()) {
        const detail = mediaqueuestatusdetail(data.detail)
        const player = mediaqueuereadlistenplayer()
        mediaqueueapplynowplayingstatus(data.status, data.detail)
        handlequeuestatus(data.status, data.detail)
        if (data.status === 'download-failed') {
          apierror(SOFTWARE, player, 'media', `download failed${detail}`)
        } else if (data.status === 'playback-failed') {
          apierror(SOFTWARE, player, 'media', `playback failed${detail}`)
        } else if (data.status === 'playing') {
          mediaqueueretryplayerconnect()
        } else if (data.status === 'audio-probe') {
          apilog(SOFTWARE, player, `media audio probe ${detail || ''}`.trim())
        }
      }
      break
    default:
      break
  }
}

function clearhelperreconnecttimer() {
  if (ispresent(helperreconnecttimer)) {
    clearTimeout(helperreconnecttimer)
    helperreconnecttimer = undefined
  }
}

function mediaqueuereconnecthelper() {
  if (!mediaqueueislistening()) {
    return
  }
  const helper = mediaqueuereadhelperpeerid().trim()
  if (!helper) {
    return
  }
  if (helperdatalinkup()) {
    return
  }
  const conn = netterminaldataconnect(helper)
  if (ispresent(conn)) {
    wirehelperconnection(conn)
  }
}

function schedulehelperreconnect() {
  if (!mediaqueueislistening()) {
    return
  }
  if (helperdatalinkup()) {
    return
  }
  if (ispresent(helperreconnecttimer)) {
    return
  }
  helperreconnecttimer = setTimeout(() => {
    helperreconnecttimer = undefined
    mediaqueuereconnecthelper()
  }, HELPER_RECONNECT_MS)
}

function wirehelperconnection(conn: DataConnection) {
  const previous = helperconnection
  helperconnection = conn
  mediaqueuesethelperconnected(conn.open)
  if (ispresent(previous) && previous !== conn) {
    previous.close()
  }
  conn.on('data', handlehelperdata)
  conn.on('open', () => {
    if (helperconnection !== conn) {
      return
    }
    clearhelperreconnecttimer()
    mediaqueuesethelperconnected(true)
    sendtohelper({
      type: 'mediaqueue:hello',
      protocol: MEDIAQUEUE_PROTOCOL,
      role: 'cafe',
      peerid: readnetworkpeerid() ?? '',
    })
    mediaqueuerequesthelpercall()
  })
  conn.on('close', () => {
    if (helperconnection === conn) {
      helperconnection = undefined
      mediaqueuesethelperconnected(false)
      schedulehelperreconnect()
    }
  })
  conn.on('error', () => {
    if (helperconnection === conn) {
      helperconnection = undefined
      mediaqueuesethelperconnected(false)
      schedulehelperreconnect()
    }
  })
}

netterminalregisterpeeropenhandler(() => {
  mediaqueuereconnecthelper()
})

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
  clearhelperreconnecttimer()
  mediaqueuesetlistening(false)
  if (ispresent(helperconnection)) {
    const conn = helperconnection
    helperconnection = undefined
    mediaqueuesethelperconnected(false)
    conn.close()
  }
  if (boundboardid) {
    syncboardhelperlayer(player, boundboardid, undefined)
  }
  mediaqueuedisconnect()
  mediaqueueclearlistenstate()
  apilog(SOFTWARE, player, 'media stopped')
}
