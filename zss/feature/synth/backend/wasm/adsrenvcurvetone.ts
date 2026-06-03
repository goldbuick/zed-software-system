import { Offline, Synth } from 'tone'

import { ENV_PARITY_ADSR_SEC } from './adsrenvcurve'

export async function rendertoneenvelopeoffline(
  gatesec: number,
  totalsec: number,
  samplerate = 44100,
): Promise<Float32Array> {
  const buffer = await Offline(async ({ transport }) => {
    const synth = new Synth({
      oscillator: { type: 'sine' },
      envelope: { ...ENV_PARITY_ADSR_SEC },
    }).toDestination()
    synth.triggerAttackRelease('C4', gatesec, 0)
    transport.start(0)
  }, totalsec)

  const native =
    typeof buffer.get === 'function' ? buffer.get() : (buffer as AudioBuffer)
  const audiobuffer = native as AudioBuffer
  return audiobuffer.getChannelData(0).slice()
}
