import { useEffect } from 'react'

/** Cancel inline link edit when the row loses selection — not when editing starts. */
export function useLinkEditCancelOnInactive(
  active: boolean,
  cancelediting: () => void,
): void {
  useEffect(() => {
    if (!active) {
      cancelediting()
    }
  }, [active, cancelediting])
}
