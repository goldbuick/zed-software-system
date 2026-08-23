import type { DataConnection } from 'peerjs'
import {
  apierror,
  apilog,
  apitoast,
  vmmediaqueueboard,
  workstatus,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { mediaqueuebootstrap } from 'zss/feature/mediaqueue/bootstrap'
import {
  mediaqueueclearboardhelper,
  mediaqueueclearlistenstate,
  mediaqueuehasanybind,
  mediaqueuehelperconnected,
  mediaqueueislistening,
  mediaqueuereadboardsforhelper,
  mediaqueuereadboundboardids,
  mediaqueuereadboundboardlabel,
  mediaqueuereadhelperforboard,
  mediaqueuereadlistenplayer,
  mediaqueuesetboardhelper,
  mediaqueuesethelperconnected,
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
  mediaqueueclearhelpersnapshot,
  mediaqueuecurrenturl,
  mediaqueuereadperplayerlimit,
} from 'zss/feature/mediaqueue/queue'
import { mediaqueuestatusworklabel } from 'zss/feature/mediaqueue/workstatuslabel'
import {
  netterminaldataconnect,
  netterminalregisterpeeropenhandler,
  readnetworkpeerid,
} from 'zss/feature/netterminal'
import { write } from 'zss/feature/writeui'
import { MAYBE, ispresent } from 'zss/mapping/types'

const HELPER_RECONNECT_MS = 1000

const helperconnections = new Map<string, DataConnection>()
let helperreconnecttimer: ReturnType<typeof setTimeout> | undefined

function sendtohelper(peerid: string, message: MEDIAQUEUE_MESSAGE) {
  const trimmed = peerid.trim()
  const conn = helperconnections.get(trimmed)
  if (!ispresent(conn) || !conn.open) {
    return
  }
  void conn.send(message)
}

function helperdatalinkup(peerid: string): boolean {
  const trimmed = peerid.trim()
  if (!trimmed) {
    return false
  }
  const conn = helperconnections.get(trimmed)
  return mediaqueuehelperconnected(trimmed) && ispresent(conn) && conn.open
}

export function mediaqueuehelperdatalinkup(peerid?: string): boolean {
  const trimmed = (peerid ?? '').trim()
  if (trimmed) {
    return helperdatalinkup(trimmed)
  }
  for (const peer of helperconnections.keys()) {
    if (helperdatalinkup(peer)) {
      return true
    }
  }
  return false
}

export function mediaqueuesendtohelper(
  message: MEDIAQUEUE_MESSAGE,
  peerid: string,
): boolean {
  const trimmed = peerid.trim()
  if (!trimmed || !helperdatalinkup(trimmed)) {
    return false
  }
  sendtohelper(trimmed, message)
  return true
}

function mediaqueuerequesthelpercall(peerid: string) {
  sendtohelper(peerid, { type: 'mediaqueue:requestcall' })
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

function mediaqueuesyncnowplayingforhelper(peerid: string, detail?: string) {
  const player = mediaqueuereadlistenplayer()
  const boards = mediaqueuereadboardsforhelper(peerid)
  if (!player || boards.length === 0) {
    return
  }
  const label = mediaqueueformatnowplayinglabel(
    detail,
    mediaqueuecurrenturl(peerid),
  )
  if (!label) {
    return
  }
  for (let i = 0; i < boards.length; ++i) {
    mediaqueuesyncnowplayingboard(player, boards[i], label)
  }
}

function mediaqueueclearnowplayingforhelper(peerid: string) {
  const player = mediaqueuereadlistenplayer()
  const boards = mediaqueuereadboardsforhelper(peerid)
  if (!player || boards.length === 0) {
    return
  }
  for (let i = 0; i < boards.length; ++i) {
    mediaqueuesyncnowplayingboard(player, boards[i], undefined)
  }
}

function mediaqueuecopynowplayingtoboard(
  player: string,
  peerid: string,
  boardid: string,
) {
  const label = mediaqueueformatnowplayinglabel(
    undefined,
    mediaqueuecurrenturl(peerid),
  )
  if (!label) {
    return
  }
  mediaqueuesyncnowplayingboard(player, boardid, label)
}

function mediaqueueapplynowplayingstatus(
  peerid: string,
  status: string,
  detail?: string,
) {
  if (status === 'buffering' || status === 'playing') {
    mediaqueuesyncnowplayingforhelper(peerid, detail)
    return
  }
  if (
    status === 'playback-ended' ||
    status === 'download-failed' ||
    status === 'playback-failed' ||
    status === 'call-stopped' ||
    status === 'queue-cleared'
  ) {
    mediaqueueclearnowplayingforhelper(peerid)
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

function mediaqueueapplyworkstatus(status: string, detail?: string) {
  const player = mediaqueuereadlistenplayer()
  if (!player) {
    return
  }
  if (
    status === 'download-failed' ||
    status === 'playback-failed' ||
    status === 'queue-cleared' ||
    status === 'playback-ended' ||
    status === 'queue-added' ||
    status === 'queue-pending' ||
    status === 'queue-error' ||
    status === 'queue-playlist' ||
    status === 'queue-unplayable'
  ) {
    workstatus(SOFTWARE, player, '')
    return
  }
  const label = mediaqueuestatusworklabel(status, detail)
  if (label) {
    workstatus(SOFTWARE, player, label)
    return
  }
  if (status === 'playing') {
    workstatus(SOFTWARE, player, '')
  }
}

function handlequeuestatus(
  peerid: string,
  status: string,
  detail?: string,
  submitter?: string,
) {
  const toastplayer = String(submitter || '').trim() || mediaqueuereadlistenplayer()
  if (status === 'queue-added') {
    if (toastplayer) {
      apitoast(SOFTWARE, toastplayer, `media added: ${detail ?? ''}`.trim())
    }
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
    const limit =
      (detail ?? '').trim() || String(mediaqueuereadperplayerlimit(peerid))
    toastlistenplayer(true, `queue limit: ${limit} per player`)
    return
  }
  if (status === 'queue-error') {
    if (!toastplayer) {
      return
    }
    if (detail === 'duplicate') {
      apitoast(SOFTWARE, toastplayer, 'URL already in queue')
      return
    }
    if (detail === 'limit') {
      apitoast(
        SOFTWARE,
        toastplayer,
        `queue limit (${mediaqueuereadperplayerlimit(peerid)} per player)`,
      )
      return
    }
    apitoast(SOFTWARE, toastplayer, 'usage: #media <url>')
    return
  }
  if (status === 'queue-pending') {
    if (toastplayer) {
      apitoast(
        SOFTWARE,
        toastplayer,
        `needs approval: ${detail ?? ''}`.trim(),
      )
    }
    return
  }
  if (status === 'queue-playlist') {
    toastlistenplayer(true, `playlist: ${detail ?? ''}`.trim())
    return
  }
  if (status === 'queue-unplayable') {
    toastlistenplayer(false, `cannot play: ${detail ?? ''}`.trim())
    return
  }
  if (status === 'queue-approved') {
    toastlistenplayer(true, `approved: ${detail ?? ''}`.trim())
    return
  }
  if (status === 'queue-rejected') {
    toastlistenplayer(true, `rejected: ${detail ?? ''}`.trim())
  }
}

function handlehelperdata(peerid: string, data: unknown) {
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
        mediaqueuerequesthelpercall(peerid)
      }
      break
    case 'mediaqueue:queuesnapshot':
      mediaqueueapplysnapshot(
        {
          urls: data.urls,
          names: data.names,
          titles: data.titles,
          submittedats: data.submittedats,
          index: data.index,
          limit: data.limit,
          pendingurls: data.pendingurls,
          pendingnames: data.pendingnames,
          pendingtitles: data.pendingtitles,
          pendingdurations: data.pendingdurations,
          playedurls: data.playedurls,
          playednames: data.playednames,
          playedtitles: data.playedtitles,
          playedsubmittedats: data.playedsubmittedats,
        },
        peerid,
      )
      if (!mediaqueuecurrenturl(peerid)) {
        mediaqueueclearnowplayingforhelper(peerid)
      }
      break
    case 'mediaqueue:status': {
      const listenplayer = mediaqueuereadlistenplayer()
      const submitter = String(data.player || '').trim()
      const queueoutcome =
        data.status === 'queue-added' ||
        data.status === 'queue-pending' ||
        data.status === 'queue-error' ||
        data.status === 'queue-unplayable' ||
        data.status === 'queue-playlist'
      if (listenplayer || (queueoutcome && submitter)) {
        const detail = mediaqueuestatusdetail(data.detail)
        const player = listenplayer || submitter
        if (listenplayer) {
          mediaqueueapplynowplayingstatus(peerid, data.status, data.detail)
          mediaqueueapplyworkstatus(data.status, data.detail)
        }
        handlequeuestatus(peerid, data.status, data.detail, submitter)
        if (listenplayer) {
          if (data.status === 'download-failed') {
            apierror(SOFTWARE, player, 'media', `download failed${detail}`)
          } else if (data.status === 'playback-failed') {
            apierror(SOFTWARE, player, 'media', `playback failed${detail}`)
          } else if (data.status === 'playing') {
            mediaqueueretryplayerconnect()
          }
        }
      }
      break
    }
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

function closehelperconnection(peerid: string) {
  const trimmed = peerid.trim()
  if (!trimmed) {
    return
  }
  const conn = helperconnections.get(trimmed)
  helperconnections.delete(trimmed)
  mediaqueuesethelperconnected(trimmed, false)
  mediaqueueclearhelpersnapshot(trimmed)
  if (ispresent(conn)) {
    try {
      conn.close()
    } catch {
      // ignore
    }
  }
}

function mediaqueuereconnecthelpers() {
  if (!mediaqueueislistening()) {
    return
  }
  const peers = new Set<string>()
  const bound = mediaqueuereadboundboardids()
  for (let i = 0; i < bound.length; ++i) {
    const helper = mediaqueuereadhelperforboard(bound[i])
    if (helper) {
      peers.add(helper)
    }
  }
  for (const helper of peers) {
    if (helperdatalinkup(helper)) {
      continue
    }
    const conn = netterminaldataconnect(helper)
    if (ispresent(conn)) {
      wirehelperconnection(conn, helper)
    }
  }
}

function schedulehelperreconnect() {
  if (!mediaqueueislistening()) {
    return
  }
  if (ispresent(helperreconnecttimer)) {
    return
  }
  helperreconnecttimer = setTimeout(() => {
    helperreconnecttimer = undefined
    mediaqueuereconnecthelpers()
  }, HELPER_RECONNECT_MS)
}

function wirehelperconnection(conn: DataConnection, peerid: string) {
  const trimmed = peerid.trim()
  if (!trimmed) {
    return
  }
  const previous = helperconnections.get(trimmed)
  helperconnections.set(trimmed, conn)
  mediaqueuesethelperconnected(trimmed, conn.open)
  if (ispresent(previous) && previous !== conn) {
    try {
      previous.close()
    } catch {
      // ignore
    }
  }
  conn.on('data', (data: unknown) => {
    handlehelperdata(trimmed, data)
  })
  conn.on('open', () => {
    if (helperconnections.get(trimmed) !== conn) {
      return
    }
    clearhelperreconnecttimer()
    mediaqueuesethelperconnected(trimmed, true)
    sendtohelper(trimmed, {
      type: 'mediaqueue:hello',
      protocol: MEDIAQUEUE_PROTOCOL,
      role: 'cafe',
      peerid: readnetworkpeerid() ?? '',
    })
    mediaqueuerequesthelpercall(trimmed)
  })
  conn.on('close', () => {
    if (helperconnections.get(trimmed) === conn) {
      helperconnections.delete(trimmed)
      mediaqueuesethelperconnected(trimmed, false)
      if (mediaqueuereadboardsforhelper(trimmed).length > 0) {
        schedulehelperreconnect()
      }
    }
  })
  conn.on('error', () => {
    if (helperconnections.get(trimmed) === conn) {
      helperconnections.delete(trimmed)
      mediaqueuesethelperconnected(trimmed, false)
      if (mediaqueuereadboardsforhelper(trimmed).length > 0) {
        schedulehelperreconnect()
      }
    }
  })
}

function ensurehelperconnection(peerid: string): MAYBE<DataConnection> {
  const trimmed = peerid.trim()
  if (!trimmed) {
    return undefined
  }
  if (helperdatalinkup(trimmed)) {
    return helperconnections.get(trimmed)
  }
  const conn = netterminaldataconnect(trimmed)
  if (ispresent(conn)) {
    wirehelperconnection(conn, trimmed)
  }
  return conn
}

netterminalregisterpeeropenhandler(() => {
  mediaqueuereconnecthelpers()
})

function openorreusehelper(
  player: string,
  peerid: string,
  boardid: string,
  boardname: string,
  replaced: boolean,
): void {
  syncboardhelperlayer(player, boardid, peerid)
  const boundcount = mediaqueuereadboardsforhelper(peerid).length
  const label = boardname || boardid
  if (replaced) {
    apilog(
      SOFTWARE,
      player,
      `media replaced helper ${peerid} on board ${label}`,
    )
  } else if (boundcount > 1) {
    apilog(
      SOFTWARE,
      player,
      `media bound to helper ${peerid} on board ${label} (${boundcount} boards)`,
    )
  } else {
    apilog(
      SOFTWARE,
      player,
      `media bound to helper ${peerid} on board ${label}`,
    )
  }
  if (helperdatalinkup(peerid)) {
    mediaqueuecopynowplayingtoboard(player, peerid, boardid)
    mediaqueueconnectifonboard(peerid, boardid)
    return
  }
  apilog(
    SOFTWARE,
    player,
    'waiting for Media Queue app to accept the connection',
  )
  const conn = ensurehelperconnection(peerid)
  if (ispresent(conn)) {
    mediaqueueconnectifonboard(peerid, boardid)
  } else {
    apierror(SOFTWARE, player, 'media', 'could not open helper data connection')
    mediaqueueclearboardhelper(boardid)
    syncboardhelperlayer(player, boardid, undefined)
    if (!mediaqueuehasanybind()) {
      mediaqueueclearlistenstate()
    }
  }
}

/**
 * Bind a desktop helper Peer id to a board. Same helper may bind many boards;
 * a different helper replaces that board only. Multiple helpers can stay open.
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
  const previous = mediaqueuereadhelperforboard(boundboardid)
  const label = boardname ?? boundboardid

  if (previous === trimmed) {
    if (helperdatalinkup(trimmed)) {
      apilog(
        SOFTWARE,
        player,
        `media already listening to helper ${trimmed} on board ${label}`,
      )
      mediaqueueretryplayerconnect()
      return
    }
    apilog(
      SOFTWARE,
      player,
      `media reconnecting to helper ${trimmed} on board ${label}`,
    )
    openorreusehelper(player, trimmed, boundboardid, label, false)
    return
  }

  if (previous && previous !== trimmed) {
    mediaqueuesetboardhelper(boundboardid, trimmed)
    mediaqueuesyncnowplayingboard(player, boundboardid, undefined)
    if (mediaqueuereadboardsforhelper(previous).length === 0) {
      mediaqueueclearnowplayingforhelper(previous)
      closehelperconnection(previous)
    }
    openorreusehelper(player, trimmed, boundboardid, label, true)
    return
  }

  mediaqueuesetboardhelper(boundboardid, trimmed)
  openorreusehelper(player, trimmed, boundboardid, label, false)
}

/**
 * Unbind the given board. When it was the last bound board, tear down helpers
 * and the local MediaConnection.
 */
export function mediaqueuestop(player: string, boardid: string): void {
  mediaqueuesetlistenplayer(player)
  const boundboardid = boardid.trim()
  if (!boundboardid) {
    apierror(SOFTWARE, player, 'media', 'need an active board to stop')
    return
  }
  const helper = mediaqueueclearboardhelper(boundboardid)
  syncboardhelperlayer(player, boundboardid, undefined)
  mediaqueuesyncnowplayingboard(player, boundboardid, undefined)
  mediaqueuedisconnect()

  if (helper && mediaqueuereadboardsforhelper(helper).length === 0) {
    closehelperconnection(helper)
  }

  if (!mediaqueuehasanybind()) {
    clearhelperreconnecttimer()
    for (const peer of Array.from(helperconnections.keys())) {
      closehelperconnection(peer)
    }
    mediaqueueclearlistenstate()
    apilog(SOFTWARE, player, 'media stopped')
    return
  }

  apilog(
    SOFTWARE,
    player,
    `media unbound from board ${mediaqueuereadboundboardlabel(boundboardid)}`,
  )
}
