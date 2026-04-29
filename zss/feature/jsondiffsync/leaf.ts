import { compare } from 'fast-json-patch'
import { deepcopy } from 'zss/mapping/types'
import { perfmeasure } from 'zss/perf/ui'

import { filterjsonpatchforsync } from './patchfilter'
import { assignintoworking, rebaseapply } from './sync'
import type {
  INBOUND_RESULT,
  JSON_DOCUMENT,
  LEAF_SESSION,
  PREPARE_OUTBOUND_RESULT,
  SYNC_MESSAGE,
} from './types'

export function leafprepareoutbound(
  session: LEAF_SESSION,
): PREPARE_OUTBOUND_RESULT {
  const ops = perfmeasure('jds:leaf:prepare:compare', () =>
    filterjsonpatchforsync(
      compare(session.shadow as object, session.working as object),
    ),
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
      session.backupshadow = deepcopy(session.shadow)
      session.unackedpreparecount = 1
    } else {
      session.unackedpreparecount++
      is_retransmit = session.unackedpreparecount > 1
    }
  }

  const seq = ops.length > 0 ? session.unackedseq! : session.nextseq++

  const message: SYNC_MESSAGE = {
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
    session.shadow = deepcopy(session.working)
    session.unackedseq = undefined
    session.backupshadow = undefined
    session.unackedpreparecount = 0
  }
}

export function leafapplyinbound(
  session: LEAF_SESSION,
  message: SYNC_MESSAGE,
): INBOUND_RESULT {
  if (message.kind === 'fullsnapshot') {
    perfmeasure('jds:leaf:inbound:fullsnapshot', () => {
      assignintoworking(session.working, message.document)
      session.shadow = deepcopy(message.document)
      session.basisversion = message.resultdocumentversion
      session.unackedseq = undefined
      session.backupshadow = undefined
      session.unackedpreparecount = 0
      session.lastpeerseqacked = message.seq
      session.awaitingsnapshot = false
      leafackoutbound(session, message.ackpeerseq)
    })
    return { ok: true, changed: true }
  }
  if (message.kind === 'requestsnapshot') {
    return { ok: true, changed: false }
  }
  if (session.awaitingsnapshot) {
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
  const r = rebaseapply(session.shadow, session.working, message.operations)
  if (!r.ok) {
    return { ok: false, needsresync: true, error: r.error }
  }
  perfmeasure('jds:leaf:inbound:applymerged', () => {
    assignintoworking(session.working, r.merged)
    session.shadow = deepcopy(r.merged)
    session.basisversion = message.resultdocumentversion
    session.lastpeerseqacked = message.seq
    leafackoutbound(session, message.ackpeerseq)
  })
  return { ok: true, changed: true }
}

export function leafapplyfullsnapshot(
  session: LEAF_SESSION,
  doc: JSON_DOCUMENT,
  document_version: number,
): LEAF_SESSION {
  assignintoworking(session.working, doc)
  session.shadow = deepcopy(doc)
  session.basisversion = document_version
  session.unackedseq = undefined
  session.backupshadow = undefined
  session.unackedpreparecount = 0
  session.lastackpiggybackedtohub = 0
  session.awaitingsnapshot = false
  return session
}
