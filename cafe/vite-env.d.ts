/// <reference types="vite/client" />

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Vite env augmentation uses interface merging
interface ImportMetaEnv {
  readonly ZSS_DEBUG_PERF_UI: string
  readonly ZSS_DEBUG_RAYCAST_DOT?: string
  readonly ZSS_DEBUG_RAYCAST_PICKSHEET?: string
  readonly ZSS_DEBUG_FLAT_CAMERA_ORTHO?: string
  readonly ZSS_E2E?: string
}
