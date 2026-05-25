export type WASM_MASTER_CHAIN = {
  wired: boolean
}

/** Single bridge: worklet → destination. All FX live in WASM play(). */
export function wirewasmmasterchain(
  ctx: AudioContext,
  worklet: AudioWorkletNode,
): WASM_MASTER_CHAIN {
  worklet.disconnect()
  worklet.channelCount = 1
  worklet.channelCountMode = 'explicit'
  worklet.channelInterpretation = 'speakers'
  ctx.destination.channelInterpretation = 'speakers'
  ctx.destination.channelCountMode = 'max'
  worklet.connect(ctx.destination)
  return { wired: true }
}
