/// <reference types="vite/client" />

declare module '*.zss?raw' {
  const content: string
  export default content
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Vite env augmentation uses interface merging
interface ImportMetaEnv {
  readonly ZSS_DEBUG_PERF_UI: string
  readonly ZSS_DEBUG_RAYCAST_DOT?: string
  readonly ZSS_DEBUG_RAYCAST_PICKSHEET?: string
  readonly ZSS_DEBUG_FLAT_CAMERA_ORTHO?: string
  readonly ZSS_WASM_SCRIPT?: string
  readonly ZSS_E2E?: string
  readonly ZSS_HOST_MEM_TRACE?: string
  readonly ZSS_DAISY_PERF?: string
  readonly ZSS_DAISY_PARITY?: string
  readonly ZSS_DAISY_NO_SIDECHAIN?: string
  readonly ZSS_DAISY_NO_MAIN_COMP?: string
  readonly ZSS_COMMIT_HASH?: string
}
