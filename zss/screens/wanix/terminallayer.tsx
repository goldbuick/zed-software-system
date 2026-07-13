import { type ReactNode } from 'react'
import { useWanixClient } from 'zss/device/wanixclient/wanixclientstore'
import { WanixTermScreen } from 'zss/screens/wanix/termscreen'
import { WanixTermSizeSync } from 'zss/screens/wanix/termsizesync'

export function WanixTerminalLayer({
  unattached,
}: {
  unattached: (attached: boolean) => ReactNode
}) {
  const attachedsession = useWanixClient((state) => state.attachedsessionkey)
  return (
    <>
      <WanixTermSizeSync />
      {attachedsession ? <WanixTermScreen /> : unattached(!!attachedsession)}
    </>
  )
}
