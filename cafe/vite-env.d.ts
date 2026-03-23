/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly ZSS_HEAVY_LLM?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
