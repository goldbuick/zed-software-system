/// <reference types="vite/client" />

/** DOM lib omits module worklet option; daisy-processor.js is an ES module. */
interface WorkletOptions {
  type?: 'classic' | 'module'
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Vite env augmentation uses interface merging
interface ImportMetaEnv {
  readonly ZSS_DEBUG_PERF_UI: string
  readonly ZSS_DEBUG_RAYCAST_DOT?: string
  readonly ZSS_DEBUG_RAYCAST_PICKSHEET?: string
  readonly ZSS_DEBUG_FLAT_CAMERA_ORTHO?: string
  readonly ZSS_E2E?: string
  readonly ZSS_WASM_SPIKE?: string
  readonly ZSS_WASM_PERF?: string
  readonly ZSS_DAISY_SYNTH?: string
  readonly ZSS_MAXI_SYNTH?: string
  readonly ZSS_DAISY_PERF?: string
  readonly ZSS_DAISY_PARITY?: string
}
