import { useSnapshot } from 'valtio'
import { useTape } from 'zss/device/tape'

import { tapeeditorstate } from './common'

export function Textrows() {
  const tape = useTape()
  const tapeeditor = useSnapshot(tapeeditorstate)

  // split by newlines ...
  // we need the shared string

  return null
}
