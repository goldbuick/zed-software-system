import { useSnapshot } from 'valtio'
import { getgadgetstate } from 'zss/device/gadgetclient'
import { Layout } from 'zss/gadget/components/layout'
import { TapeConsole } from 'zss/gadget/components/tape'
import { UserFocus } from 'zss/gadget/components/userinput'
import { PANEL } from 'zss/gadget/data/types'

export function Gadget() {
  const state = getgadgetstate()
  const { player, layout, layers } = useSnapshot(state)
  return (
    <UserFocus>
      <TapeConsole key="console" />
      <Layout
        key={`layout-${layers.length}`}
        player={player}
        layout={layout as PANEL[]}
        layers={state.layers}
      />
    </UserFocus>
  )
}
