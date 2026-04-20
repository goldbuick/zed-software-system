import { useTape } from 'zss/gadget/data/zustandstores'

import { InspectorPts } from './pts'
import { InspectorSelect } from './select'

export function InspectorComponent({ z }: { z?: number }) {
  const inspector = useTape((state) => state.inspector)
  return (
    inspector && (
      <group position-z={z}>
        <InspectorSelect />
        <InspectorPts />
      </group>
    )
  )
}
