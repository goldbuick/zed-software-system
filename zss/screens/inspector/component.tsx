import { useTape } from 'zss/gadget/data/state'

import { InspectorPts } from './pts'
import { InspectorSelect } from './select'

export function InspectorComponent() {
  const inspector = useTape((state) => state.inspector)
  return (
    inspector && (
      <>
        <InspectorSelect />
        <InspectorPts />
      </>
    )
  )
}
