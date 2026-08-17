declare module 'butterchurn' {
  const butterchurn: {
    createVisualizer: (
      audioContext: AudioContext,
      canvas: HTMLCanvasElement,
      opts: { width: number; height: number },
    ) => {
      connectAudio: (node: AudioNode) => void
      loadPreset: (preset: unknown, blendtime: number) => void
      setRendererSize: (width: number, height: number) => void
      render: () => void
    }
  }
  export default butterchurn
}

declare module 'butterchurn-presets' {
  const butterchurnPresets: {
    getPresets: () => Record<string, unknown>
  }
  export default butterchurnPresets
}
