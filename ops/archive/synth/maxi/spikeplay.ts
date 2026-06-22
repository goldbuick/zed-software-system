/** Phase 0 spike: single saw voice at A4. */
export const WASM_SPIKE_PLAY_CODE = `
var osc = new Maximilian.maxiOsc();
function play() {
  var out = osc.saw(440) * 0.5;
  return [out, out];
}
`
