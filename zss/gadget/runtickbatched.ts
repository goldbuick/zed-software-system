/** Runs hub tick delivery. No react-dom batching: workers must not import React. */
export function runtickbatched(run: () => void): void {
  run()
}
