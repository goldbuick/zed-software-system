/*
 * jsonpipe v1 — plain JSON, gadget-parity mechanic (fullsync + patch), implemented with
 * fast-json-patch duplex observe/generate (not compare).
 *
 * Wire kinds: fullsync (full document) and patch (RFC 6902 ops).
 *
 * Producer (observed root):
 * - Local edits → generate(observer) → filterpatch(shouldemitpath) → emit patch (if nonempty).
 * - Remote / merged inbound patches → filterpatch → applyPatch(observed root) → generate(observer)
 *   and discard the result so the internal mirror stays aligned without echoing remote ops on the wire.
 *
 * Use filterpatch symmetrically on outbound and inbound ops for paths to omit (e.g. runtime-only
 * lookup / named). Peers that do not hold an observer use applypatchtoreplica (filter + applyPatch
 * on a deepcopy).
 *
 * Phase 2 (not here): sim VM memory document stream, boardrunner flags/boards streams — see simspace.
 */

export {
  applypatchtoreplica,
  createjsonpipe,
  filterpatch,
  type ApplyPatchToReplicaResult,
  type JsonPipeHandle,
  type JsonPipeOptions,
  type Operation,
} from './jsonpipe'
