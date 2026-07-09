/** Tunable GPU coordination policy (constants only — no UI yet). */

export const STT_IDLE_DISPOSE_MS = 60_000

/** Headroom reserved below adapter maxBufferSize before allowing dual residency. */
export const GPU_HEADROOM_BYTES = 1_073_741_824

/** Conservative in-browser weight estimates (bytes). Tune empirically. */
export const GEMMA_ESTIMATE_BYTES = 2_684_354_560
export const CLASSIFIER_ESTIMATE_BYTES = 209_715_200
export const MOONSHINE_ESTIMATE_BYTES = 419_430_400

export type GPU_PRIORITY = 'stt'

export type GPU_RESIDENCY = 'dual' | 'exclusive'
