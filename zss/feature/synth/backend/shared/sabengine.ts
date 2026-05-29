/** Minimal engine surface for zero-copy SAB push (Maximilian + Daisy). */
export type SabEngine = {
  audioWorkletNode: AudioWorkletNode
  audioContext: BaseAudioContext
}
