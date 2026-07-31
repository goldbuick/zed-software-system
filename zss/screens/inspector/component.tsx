import { useInspector, useTape } from 'zss/gadget/data/zustandstores'

import { InspectorPts } from './pts'
import { InspectorSelect } from './select'

export function InspectorComponent({ z }: { z?: number }) {
  const inspector = useTape((state) => state.inspector)
  const ptssize = useInspector((state) => state.pts.length)
  if (!inspector && ptssize === 0) {
    return null
  }
  return (
    <group position-z={z}>
      {inspector && <InspectorSelect />}
      {ptssize > 0 && <InspectorPts />}
    </group>
  )
}
