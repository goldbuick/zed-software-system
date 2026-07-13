import { type ReactNode, useEffect, useState } from 'react'
import {
  readattachedsession,
  subscribewanixattach,
} from 'zss/device/wanixclient/wanixdisplay'
import { WanixTermScreen } from 'zss/screens/wanix/termscreen'
import { WanixTermSizeSync } from 'zss/screens/wanix/termsizesync'

export function WanixTerminalLayer({
  unattached,
}: {
  unattached: (attached: boolean) => ReactNode
}) {
  const [attachedsession, setattachedsession] = useState(readattachedsession)
  useEffect(
    () => subscribewanixattach(() => setattachedsession(readattachedsession())),
    [],
  )
  return (
    <>
      <WanixTermSizeSync />
      {attachedsession ? <WanixTermScreen /> : unattached(!!attachedsession)}
    </>
  )
}
