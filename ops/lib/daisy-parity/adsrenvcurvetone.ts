import { Offline, Synth } from 'tone'
import { ENV_PARITY_ADSR_SEC } from 'zss/feature/synth/backend/wasm/adsrenvcurve'

export async function rendertoneenvelopeoffline(
  gatesec: number,
  totalsec: number,
  _samplerate = 44100,
): Promise<Float32Array> {
  void _samplerate
  const buffer = await Offline(({ transport }) => {
    const synth = new Synth({
      oscillator: { type: 'sine' },
      envelope: { ...ENV_PARITY_ADSR_SEC },
    }).toDestination()
    synth.triggerAttackRelease('C4', gatesec, 0)
    transport.start(0)
  }, totalsec)

  const native =
    typeof buffer.get === 'function'
      ? buffer.get()
      : (buffer as unknown as AudioBuffer)
  const audiobuffer = native!
  return audiobuffer.getChannelData(0).slice()
}
