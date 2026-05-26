/** JS ADSR — vendored maximilian WASM has no maxiEnv export. */
export const WASM_ENV_CODE = `
function zssenv(attackms, decayms, sustain, releasems) {
  var env = {
    attackms: attackms,
    decayms: decayms,
    sustain: sustain,
    releasems: releasems,
    level: 0,
    stage: 'idle',
    gateprev: 0,
    atkinc: 0,
    decinc: 0,
    relinc: 0,
    refreshinc: function() {
      var sr = typeof sampleRate !== 'undefined' ? sampleRate : 44100;
      this.atkinc = 1 / Math.max(1, this.attackms * 0.001 * sr);
      this.decinc = (1 - this.sustain) / Math.max(1, this.decayms * 0.001 * sr);
      this.relinc = this.sustain / Math.max(1, this.releasems * 0.001 * sr);
    },
    adsr: function(input, gate) {
      var g = gate > 0.5 ? 1 : 0;

      if (g && !this.gateprev) {
        this.stage = 'attack';
      } else if (!g && this.gateprev) {
        this.stage = 'release';
      }
      this.gateprev = g;

      if (this.stage === 'attack') {
        this.level += this.atkinc;
        if (this.level >= 1) {
          this.level = 1;
          this.stage = 'decay';
        }
      } else if (this.stage === 'decay') {
        this.level -= this.decinc;
        if (this.level <= this.sustain) {
          this.level = this.sustain;
          this.stage = g ? 'sustain' : 'release';
        }
      } else if (this.stage === 'sustain') {
        this.level = this.sustain;
        if (!g) {
          this.stage = 'release';
        }
      } else if (this.stage === 'release') {
        this.level -= this.relinc;
        if (this.level <= 0) {
          this.level = 0;
          this.stage = 'idle';
        }
      } else if (g) {
        this.stage = 'attack';
      }

      return input * this.level;
    },
    setparams: function(attackms, decayms, sustain, releasems) {
      this.attackms = attackms;
      this.decayms = decayms;
      this.sustain = sustain;
      this.releasems = releasems;
      this.refreshinc();
    },
  };
  env.refreshinc();
  return env;
}
`
