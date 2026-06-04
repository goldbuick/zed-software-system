/** Shared wall-clock limits for offline parity Playwright / shell scripts. */

/** Per-scenario Playwright default (evaluate + navigation). */
export const PLAYWRIGHT_SCENARIO_TIMEOUT_MS = 180_000

/** Whole-script ceiling for multi-scenario render drivers. */
export const PARITY_RENDER_SCRIPT_TIMEOUT_MS = 600_000

/** `yarn build:daisy` subprocess. */
export const EXEC_BUILD_DAISY_TIMEOUT_MS = 120_000

/** Single render driver (`render:synth-env-parity`, etc.). */
export const EXEC_RENDER_PARITY_TIMEOUT_MS = 600_000

/** Gate-only scripts (`test:synth-env-parity`). */
export const EXEC_GATE_TIMEOUT_MS = 60_000

/** One calibrator grid step (build + render + read JSON). */
export const EXEC_CALIBRATE_STEP_TIMEOUT_MS = 900_000

/** Full calibrator run ceiling. */
export const CALIBRATE_SCRIPT_TIMEOUT_MS = 3_600_000

export async function withscripttimeout<T>(
  label: string,
  ms: number,
  fn: () => Promise<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
  })
  try {
    return await Promise.race([fn(), timeout])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}
