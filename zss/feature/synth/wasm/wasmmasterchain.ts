/** Matches Tone `volumetodb` in fx.ts without pulling the Tone FX graph. */
function volumetodb(value: number) {
  return 20 * Math.log10(value) - 35
}

export type WASM_MASTER_CHAIN = {
  voicegain: GainNode
  mainvolume: GainNode
  compressor: DynamicsCompressorNode
}

/** Small headroom trim after main compressor (Tone path also runs razzle + sidechain). */
const WASM_MASTER_TRIM_DB = -3

let pendingplayvolume = 80

function configurewasmoutput(ctx: AudioContext, worklet: AudioWorkletNode) {
  worklet.channelCount = 1
  worklet.channelCountMode = 'explicit'
  worklet.channelInterpretation = 'speakers'
  ctx.destination.channelInterpretation = 'speakers'
  ctx.destination.channelCountMode = 'max'
}

export function wirewasmmasterchain(
  ctx: AudioContext,
  worklet: AudioWorkletNode,
): WASM_MASTER_CHAIN {
  worklet.disconnect()
  configurewasmoutput(ctx, worklet)

  const voicegain = ctx.createGain()
  const mainvolume = ctx.createGain()
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -28
  compressor.ratio.value = 4
  compressor.attack.value = 0.003
  compressor.release.value = 0.15
  compressor.knee.value = 30

  worklet.connect(voicegain)
  voicegain.connect(compressor)
  compressor.connect(mainvolume)
  mainvolume.connect(ctx.destination)

  voicegain.gain.value = 1
  const chain = {
    voicegain,
    mainvolume,
    compressor,
  }
  setwasmplayvolume(chain, pendingplayvolume)
  return chain
}

export function setwasmplayvolume(chain: WASM_MASTER_CHAIN, volume: number) {
  pendingplayvolume = volume
  applywasmplayvolume(chain, volume)
}

export function rememberwasmplayvolume(volume: number) {
  pendingplayvolume = volume
}

function applywasmplayvolume(chain: WASM_MASTER_CHAIN, volume: number) {
  const db = volumetodb(Math.max(volume, 0.001) * 0.25) + WASM_MASTER_TRIM_DB
  chain.mainvolume.gain.value = Math.pow(10, db / 20)
}

/** Sidechain duck depth/recovery per drum (clap stronger, bass lighter). */
const WASM_DUCK_ATTACK_SEC = 0.004
const WASM_DUCK_CLAP_FLOOR = 0.16
const WASM_DUCK_CLAP_HOLD_SEC = 0.028
const WASM_DUCK_CLAP_RELEASE_SEC = 0.14
const WASM_DUCK_BASS_FLOOR = 0.92
const WASM_DUCK_BASS_HOLD_SEC = 0
const WASM_DUCK_BASS_RELEASE_SEC = 0.045

function duckprofile(drumid: number) {
  if (drumid === 3) {
    return {
      floor: WASM_DUCK_CLAP_FLOOR,
      holdsec: WASM_DUCK_CLAP_HOLD_SEC,
      releasesec: WASM_DUCK_CLAP_RELEASE_SEC,
    }
  }
  if (drumid === 9) {
    return {
      floor: WASM_DUCK_BASS_FLOOR,
      holdsec: WASM_DUCK_BASS_HOLD_SEC,
      releasesec: WASM_DUCK_BASS_RELEASE_SEC,
    }
  }
  return {
    floor: 0.45,
    holdsec: 0,
    releasesec: 0.12,
  }
}

export function duckwasmsidechain(
  chain: WASM_MASTER_CHAIN,
  ctx: AudioContext,
  drumid: number,
) {
  const profile = duckprofile(drumid)
  const now = ctx.currentTime
  const gain = chain.voicegain.gain
  const duckat = now + WASM_DUCK_ATTACK_SEC
  const releaseat = duckat + profile.holdsec + profile.releasesec
  gain.cancelScheduledValues(now)
  gain.setValueAtTime(gain.value, now)
  gain.linearRampToValueAtTime(profile.floor, duckat)
  if (profile.holdsec > 0) {
    gain.setValueAtTime(profile.floor, duckat + profile.holdsec)
  }
  gain.linearRampToValueAtTime(1, releaseat)
}
