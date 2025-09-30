import { useTape } from 'zss/gadget/data/state'

import { Pts } from './pts'
import { Select } from './select'

export function TapeTerminalInspector() {
  const inspector = useTape((state) => state.inspector)
  return (
    inspector && (
      <>
        <Select />
        <Pts />
      </>
    )
  )
}
