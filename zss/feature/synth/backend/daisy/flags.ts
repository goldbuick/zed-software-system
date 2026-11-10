/** Lighter DSP preset — on by default; set `ZSS_DAISY_PERF=false` for full quality. */
export function isdaisyperfmode(): boolean {
  return import.meta.env.ZSS_DAISY_PERF !== 'false'
}

/** Offline parity renders for Daisy backend. */
export function isdaisyparityenabled(): boolean {
  return import.meta.env.ZSS_DAISY_PARITY === '1'
}

function envflagon(value: string | undefined): boolean {
  return value === '1' || value === 'true'
}

function urlflagon(name: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const raw = new URLSearchParams(window.location.search).get(name)
  if (raw === null) {
    return false
  }
  if (raw === '' || raw === '1' || raw === 'true') {
    return true
  }
  return false
}

/** Play-bus sidechain duck bypass (live dev: env or `?no_sc=1`). */
export function isdaisysidechainbypass(): boolean {
  return envflagon(import.meta.env.ZSS_DAISY_NO_SIDECHAIN) || urlflagon('no_sc')
}

/**
 * Mute sidechain key only (live: env or `?no_sc_key=1`).
 * Duck path stays wired at idle makeup; drums/bg/tts do not trigger GR.
 */
export function isdaisysidechainkeymute(): boolean {
  return (
    envflagon(import.meta.env.ZSS_DAISY_NO_SC_KEY) || urlflagon('no_sc_key')
  )
}

/** Main bus compressor bypass (live dev: env or `?no_comp=1`). */
export function isdaisymaincompbypass(): boolean {
  return (
    envflagon(import.meta.env.ZSS_DAISY_NO_MAIN_COMP) || urlflagon('no_comp')
  )
}
