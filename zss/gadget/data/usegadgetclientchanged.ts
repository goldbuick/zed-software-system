import { useShallow } from 'zustand/react/shallow'

import { useGadgetClient } from './zustandstores'

/**
 * Subscribe to the gadget fields that should invalidate R3F views that also read
 * `useGadgetClient.getState()` during render (sync rev, board, layer stacks, exits).
 */
export function useGadgetClientChanged(): number {
  const gadgetsyncrev = useGadgetClient((state) => state.gadgetsyncrev)
  useGadgetClient((state) => state.gadget.board)
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)
  useGadgetClient(
    useShallow((state) => ({
      exiteast: state.gadget.exiteast,
      exitwest: state.gadget.exitwest,
      exitnorth: state.gadget.exitnorth,
      exitsouth: state.gadget.exitsouth,
      exitne: state.gadget.exitne,
      exitnw: state.gadget.exitnw,
      exitse: state.gadget.exitse,
      exitsw: state.gadget.exitsw,
    })),
  )
  return gadgetsyncrev
}
