/** Opt in with `ZSS_DAISY_SYNTH=true`. */
export function isdaisysynthenabled(): boolean {
  return import.meta.env.ZSS_DAISY_SYNTH === 'true'
}

/** Force Maximilian with `ZSS_MAXI_SYNTH=true`. */
export function ismaxisynthenabled(): boolean {
  return import.meta.env.ZSS_MAXI_SYNTH === 'true'
}

/** Lighter DSP preset — on by default; set `ZSS_DAISY_PERF=false` for full quality. */
export function isdaisyperfmode(): boolean {
  return import.meta.env.ZSS_DAISY_PERF !== 'false'
}

/** Offline parity renders for Daisy backend. */
export function isdaisyparityenabled(): boolean {
  return import.meta.env.ZSS_DAISY_PARITY === '1'
}
