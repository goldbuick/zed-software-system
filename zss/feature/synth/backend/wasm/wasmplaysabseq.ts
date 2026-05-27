import { WASM_SAB_SEQ_IDX, WASM_SAB_SEQ_LEN } from './wasmsabchannels'

/** Worklet-side SAB dirty-flag helpers (mirrors main-thread WASM_SAB_SEQ_IDX). */
export const WASM_SAB_SEQ_PLAY_CODE = `
var SAB_SEQ_VOICES = ${WASM_SAB_SEQ_IDX.VOICES};
var SAB_SEQ_DRUMS = ${WASM_SAB_SEQ_IDX.DRUMS};
var SAB_SEQ_MASTER = ${WASM_SAB_SEQ_IDX.MASTER};
var SAB_SEQ_FX = ${WASM_SAB_SEQ_IDX.FX};
var SAB_SEQ_VOICE_CFG = ${WASM_SAB_SEQ_IDX.VOICE_CFG};
var SAB_SEQ_OSC_CFG = ${WASM_SAB_SEQ_IDX.OSC_CFG};
var SAB_SEQ_ALGO_CFG = ${WASM_SAB_SEQ_IDX.ALGO_CFG};
var sabseqlocal = [${new Array(WASM_SAB_SEQ_LEN).fill('-1').join(', ')}];
function sabseqchanged(idx) {
  var raw = qref.zssSabSeq || (qref.engine && qref.engine.zssSabSeq);
  if (!raw) {
    return true;
  }
  var seq = Atomics.load(raw, idx);
  if (sabseqlocal[idx] !== seq) {
    sabseqlocal[idx] = seq;
    return true;
  }
  return false;
}
`
