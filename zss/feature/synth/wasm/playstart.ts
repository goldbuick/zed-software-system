/** When the pacer is stale, start the next #play at now instead of in the past. */
export function resolveplaystarttime(pacertime: number, now: number): number {
  if (pacertime === -1 || pacertime < now) {
    return now
  }
  return pacertime
}
