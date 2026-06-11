export type WASM_MAIN_CHAIN = {
  wired: boolean
}

/** Single bridge: worklet → destination. All FX live in WASM play(). */
export function wirewasmmainchain(
  ctx: AudioContext,
  worklet: AudioWorkletNode,
): WASM_MAIN_CHAIN {
  worklet.disconnect()
  worklet.channelCount = 1
  worklet.channelCountMode = 'explicit'
  worklet.channelInterpretation = 'speakers'
  ctx.destination.channelInterpretation = 'speakers'
  ctx.destination.channelCountMode = 'max'
  worklet.connect(ctx.destination)
  return { wired: true }
}
