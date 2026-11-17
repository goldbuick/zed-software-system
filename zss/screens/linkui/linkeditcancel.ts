import { useEffect, useRef } from 'react'

/** Cancel inline link edit when the row loses selection — not when editing
 * starts via hotkey while the row was never selected. */
export function useLinkEditCancelOnInactive(
  active: boolean,
  cancelediting: () => void,
): void {
  const wasactive = useRef(active)
  useEffect(() => {
    if (wasactive.current && !active) {
      cancelediting()
    }
    wasactive.current = active
  }, [active, cancelediting])
}
