/** Tone sidechain compressor on play bus — triggered by bgplay + TTS (audiochain.ts). */
export const WASM_SIDECHAIN_PLAY_CODE = `
var SC_THRESHOLD_DB = -42;
var SC_RATIO = 5;
var SC_ATTACK_SEC = 0.005;
var SC_RELEASE_SEC = 0.06;
var SC_MIX = 0.75;
var SC_MAKEUP_DB = 24;
var SC_SEND_TRIM = ${Math.pow(10, -12 / 20).toFixed(8)};

var scattackcoef = 1 - Math.exp(-1 / (SC_ATTACK_SEC * MASTER_SR));
var screleasecoef = 1 - Math.exp(-1 / (SC_RELEASE_SEC * MASTER_SR));
var sclevelcoef = scattackcoef;
var scprevlevelpow = 1e-6;
var scprevgaindb = 0;
var scgainlinear = 1;

function sidechainupdate(signal) {
  var s = signal < 0 ? -signal : signal;
  scprevlevelpow = sclevelcoef * scprevlevelpow + (1 - sclevelcoef) * s * s;
  if (scprevlevelpow < 1e-6) {
    scprevlevelpow = 1e-6;
  }
  var leveldb = Math.log10(scprevlevelpow) * 10;
  var above = leveldb - SC_THRESHOLD_DB;
  var targetdb = above / SC_RATIO - above;
  if (targetdb > 0) {
    targetdb = 0;
  }
  var gaindb = targetdb;
  if (gaindb < scprevgaindb) {
    gaindb = scprevgaindb + (gaindb - scprevgaindb) * scattackcoef;
  } else {
    gaindb = scprevgaindb + (gaindb - scprevgaindb) * screleasecoef;
  }
  scprevgaindb = gaindb;
  scgainlinear = Math.pow(10, (gaindb + SC_MAKEUP_DB) / 20);
}

function sidechaingain() {
  return 1 + (scgainlinear - 1) * SC_MIX;
}

function bgplayactive() {
  for (var i = PLAY_VOICE_COUNT; i < VOICE_COUNT; i++) {
    if (gates[i]) {
      return true;
    }
  }
  return false;
}

function sidechaintriggersample(bgsignal, ttssignal) {
  var trigger = 0;
  if (bgplayactive()) {
    trigger = bgsignal;
  }
  if (ttssignal !== ttssignal) {
    ttssignal = 0;
  }
  if (ttssignal !== 0) {
    trigger += ttssignal;
  }
  if (trigger !== 0) {
    sidechainupdate(trigger * SC_SEND_TRIM);
  } else {
    sidechainupdate(0);
  }
}
`
