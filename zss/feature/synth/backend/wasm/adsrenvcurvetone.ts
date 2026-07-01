import { Offline, Synth } from 'tone'

import { ENV_PARITY_ADSR_SEC } from './adsrenvcurve'

/** Tone offline reference for ADSR sustain metrics (regen fixture). */
export async function rendertoneenvelopeoffline(
  gatesec: number,
  totalsec: number,
): Promise<Float32Array> {
  const rendered = await Offline(({ transport }) => {
    const synth = new Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: ENV_PARITY_ADSR_SEC.attack,
        decay: ENV_PARITY_ADSR_SEC.decay,
        sustain: ENV_PARITY_ADSR_SEC.sustain,
        release: ENV_PARITY_ADSR_SEC.release,
      },
    }).toDestination()
    synth.volume.value = 20 * Math.log10(0.25)
    synth.triggerAttackRelease('C4', gatesec, 0)
    transport.start(0)
  }, totalsec)
  const native =
    typeof rendered.get === 'function'
      ? rendered.get()
      : (rendered as unknown as AudioBuffer)
  if (!native) {
    throw new Error('adsrenvcurvetone: offline render returned no buffer')
  }
  return native.getChannelData(0).slice()
}
