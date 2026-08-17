export type MQ_VISUALIZER_PRESET_OPTS = {
  canvas: HTMLCanvasElement
  audioctx: AudioContext
  analyser: AnalyserNode
  source: AudioNode
  artwork: HTMLImageElement | null
  timedata: Uint8Array<ArrayBuffer>
  freqdata: Uint8Array<ArrayBuffer>
}

export type MQ_VISUALIZER_PRESET_HANDLE = {
  stop: () => void
}

export type MQ_VISUALIZER_PRESET = {
  id: string
  start: (
    opts: MQ_VISUALIZER_PRESET_OPTS,
  ) => Promise<MQ_VISUALIZER_PRESET_HANDLE> | MQ_VISUALIZER_PRESET_HANDLE
}
