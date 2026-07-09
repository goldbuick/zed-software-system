/** Dev/validator perf marks — console `[wanix-perf] label json`. */
export function wanixperfmark(label: string, extra?: Record<string, unknown>) {
  const payload =
    extra && Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : ''
  console.info(`[wanix-perf] ${label}${payload}`)
}
