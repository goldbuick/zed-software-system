import { compare } from 'fast-json-patch'
import { jsondocumentcopy } from 'zss/mapping/types'

import {
  JSONDIFFSYNC_IGNORE_NONE,
  JSONDIFFSYNC_IGNORE_PARENT_CHILD,
  JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
  JSONDIFFSYNC_SUBDOC_SUBTREE_SEGMENT,
  jsondiffsyncdiff,
} from './patchfilter'
import { assignintoworking, rebaseapply } from './sync'
import {
  JSONDIFFSYNC_STREAM_BOARD,
  JSONDIFFSYNC_STREAM_MEMORY,
  type INBOUND_RESULT,
  type JSON_DOCUMENT,
  type LEAF_SESSION,
  type PREPARE_OUTBOUND_RESULT,
  type SYNC_MESSAGE,
} from './types'

function leafsyncdiffrulesforauthority(session: LEAF_SESSION) {
  const rootsubdocauthority = session.streamid !== JSONDIFFSYNC_STREAM_MEMORY
  return rootsubdocauthority
    ? {
        rules: JSONDIFFSYNC_IGNORE_NONE,
        subtreesegment: JSONDIFFSYNC_SUBDOC_SUBTREE_SEGMENT,
        rootsubdocauthority,
      }
    : {
        rules: JSONDIFFSYNC_IGNORE_PARENT_CHILD,
        subtreesegment: JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
        rootsubdocauthority,
      }
}

function leafroutingfrom(session: LEAF_SESSION): {
  streamid: string
  boardsynctarget?: string
} {
  const o: { streamid: string; boardsynctarget?: string } = {
    streamid: session.streamid,
  }
  if (session.boardsynctarget !== undefined) {
    o.boardsynctarget = session.boardsynctarget
  }
  return o
}

export function leafprepareoutbound(
  session: LEAF_SESSION,
): PREPARE_OUTBOUND_RESULT {
  if (session.awaitingsnapshot) {
    return { message: undefined, reason: 'noop' }
  }
  const dfr = leafsyncdiffrulesforauthority(session)
  const ops = jsondiffsyncdiff(
    session.shadow as object,
    session.working as object,
    dfr.rules,
    dfr.subtreesegment,
    session.streamingorepathprefixes,
    dfr.rootsubdocauthority,
  )
  const needhuback = session.lastpeerseqacked > session.lastackpiggybackedtohub
  if (ops.length === 0 && !needhuback) {
    return { message: undefined, reason: 'noop' }
  }
  let is_retransmit = false
  if (ops.length > 0) {
    if (session.unackedseq === undefined) {
      session.unackedseq = session.nextseq
      session.nextseq++
      session.backupshadow = jsondocumentcopy(session.shadow)
      session.unackedpreparecount = 1
    } else {
      session.unackedpreparecount++
      is_retransmit = session.unackedpreparecount > 1
    }
  }

  const seq = ops.length > 0 ? session.unackedseq! : session.nextseq++

  const message: SYNC_MESSAGE = {
    ...leafroutingfrom(session),
    kind: 'delta',
    senderpeer: session.peer,
    seq,
    ackpeerseq: session.lastpeerseqacked,
    basisversion: session.basisversion,
    resultdocumentversion: session.basisversion,
    operations: ops,
  }
  if (needhuback) {
    session.lastackpiggybackedtohub = session.lastpeerseqacked
  }
  return { message, isretransmit: is_retransmit }
}

export function leafackoutbound(
  session: LEAF_SESSION,
  hub_ack_peer_seq: number,
) {
  if (
    session.unackedseq !== undefined &&
    hub_ack_peer_seq >= session.unackedseq
  ) {
    session.shadow = jsondocumentcopy(session.working)
    session.unackedseq = undefined
    session.backupshadow = undefined
    session.unackedpreparecount = 0
  }
}

export function leafapplyinbound(
  session: LEAF_SESSION,
  message: SYNC_MESSAGE,
): INBOUND_RESULT {
  if (session.streamid !== message.streamid) {
    return {
      ok: false,
      needsresync: true,
      error: new Error('jsondiffsync: stream id mismatch'),
    }
  }
  if (
    session.streamid === JSONDIFFSYNC_STREAM_BOARD &&
    session.boardsynctarget !== undefined &&
    message.boardsynctarget !== session.boardsynctarget
  ) {
    return {
      ok: false,
      needsresync: true,
      error: new Error('jsondiffsync: board sync target mismatch'),
    }
  }
  if (message.kind === 'fullsnapshot') {
    const hubops = compare(session.shadow as object, message.document as object)
    const lr = leafsyncdiffrulesforauthority(session)
    const rebased = rebaseapply(
      session.shadow,
      session.working,
      hubops,
      session.streamingorepathprefixes,
      lr.rules,
      lr.subtreesegment,
    )
    if (rebased.ok) {
      assignintoworking(session.working, rebased.merged)
    } else {
      assignintoworking(session.working, message.document)
    }
    session.shadow = jsondocumentcopy(message.document)
    session.basisversion = message.resultdocumentversion
    session.unackedseq = undefined
    session.backupshadow = undefined
    session.unackedpreparecount = 0
    session.lastpeerseqacked = message.seq
    session.awaitingsnapshot = false
    leafackoutbound(session, message.ackpeerseq)
    return { ok: true, changed: true }
  }
  if (message.kind === 'requestsnapshot') {
    return { ok: true, changed: false }
  }
  if (session.awaitingsnapshot) {
    /** Empty hub ack/basis bumps carry no doc ops; advance DV + seq even if `basisversion` lags (avoids stale leaf basis vs hub row). */
    if (message.kind === 'delta' && message.operations.length === 0) {
      session.basisversion = message.resultdocumentversion
      session.lastpeerseqacked = message.seq
      leafackoutbound(session, message.ackpeerseq)
      return { ok: true, changed: false }
    }
    /** Non-empty hub deltas while waiting for a full snapshot must not be silently dropped — that desyncs hub row vs leaf and causes resync storms (hub rejects leaf deltas with basis_version mismatch). */
    if (message.kind === 'delta' && message.operations.length > 0) {
      return {
        ok: false,
        needsresync: true,
        error: new Error(
          'jsondiffsync: non-empty hub delta while awaiting full snapshot',
        ),
      }
    }
    return { ok: true, changed: false }
  }
  if (message.kind === 'delta' && message.operations.length === 0) {
    if (message.basisversion !== session.basisversion) {
      return {
        ok: false,
        needsresync: true,
        error: new Error('jsondiffsync: inbound basis_version mismatch'),
      }
    }
    session.basisversion = message.resultdocumentversion
    session.lastpeerseqacked = message.seq
    leafackoutbound(session, message.ackpeerseq)
    return { ok: true, changed: false }
  }
  if (message.basisversion !== session.basisversion) {
    return {
      ok: false,
      needsresync: true,
      error: new Error('jsondiffsync: inbound basis_version mismatch'),
    }
  }
  const lr = leafsyncdiffrulesforauthority(session)
  const r = rebaseapply(
    session.shadow,
    session.working,
    message.operations,
    session.streamingorepathprefixes,
    lr.rules,
    lr.subtreesegment,
  )
  if (!r.ok) {
    return { ok: false, needsresync: true, error: r.error }
  }
  assignintoworking(session.working, r.merged)
  session.shadow = jsondocumentcopy(r.merged)
  session.basisversion = message.resultdocumentversion
  session.lastpeerseqacked = message.seq
  leafackoutbound(session, message.ackpeerseq)
  return { ok: true, changed: true }
}

export function leafapplyfullsnapshot(
  session: LEAF_SESSION,
  doc: JSON_DOCUMENT,
  document_version: number,
): LEAF_SESSION {
  const hubops = compare(session.shadow as object, doc as object)
  const lr = leafsyncdiffrulesforauthority(session)
  const rebased = rebaseapply(
    session.shadow,
    session.working,
    hubops,
    session.streamingorepathprefixes,
    lr.rules,
    lr.subtreesegment,
  )
  if (rebased.ok) {
    assignintoworking(session.working, rebased.merged)
  } else {
    assignintoworking(session.working, doc)
  }
  session.shadow = jsondocumentcopy(doc)
  session.basisversion = document_version
  session.unackedseq = undefined
  session.backupshadow = undefined
  session.unackedpreparecount = 0
  session.lastackpiggybackedtohub = 0
  session.awaitingsnapshot = false
  return session
}
